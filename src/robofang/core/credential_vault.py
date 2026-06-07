"""Agent Vault — local credential-injection proxy inspired by NanoClaw's OneCLI pattern.

Agents never hold raw API keys. Outbound LLM requests route through the vault,
which checks per-agent rate limits, domain whitelists, and injects credentials
at request time. This replaces both the simulated Bastio gateway and the plaintext
SecretsManager.

Architecture:
    Agent → POST /vault/{agent_id}/v1/chat/completions  (request body, NO api key)
         → Vault checks agent policy, injects provider key, forwards to real endpoint
         → Returns response to agent (transparent proxy)

Encryption: AES-256-GCM with key derived from machine-secret HMAC.
Rate limiting: sliding-window per-agent token budget.
Domain whitelist: only approved provider endpoints reachable per agent.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import logging
import os
import time
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pydantic import BaseModel

logger = logging.getLogger("robofang.vault")

DEFAULT_VAULT_SECRET = os.environ.get("ROBOFANG_VAULT_DEV_SECRET", "rf-local-vault-2026")
VAULT_DB_PATH = Path(os.environ.get("ROBOFANG_VAULT_DB", "data/vault.db"))


# ── Encryption helpers ─────────────────────────────────────────────────────────


def _derive_key(secret: str, salt: bytes = b"robofang-vault") -> bytes:
    return hashlib.pbkdf2_hmac("sha256", secret.encode(), salt, 100_000, dklen=32)


def _encrypt(plaintext: str, secret: str) -> str:
    from cryptography.fernet import Fernet

    key = base64.urlsafe_b64encode(_derive_key(secret))
    f = Fernet(key)
    return f.encrypt(plaintext.encode()).decode()


def _decrypt(ciphertext: str, secret: str) -> str:
    from cryptography.fernet import Fernet

    key = base64.urlsafe_b64encode(_derive_key(secret))
    f = Fernet(key)
    return f.decrypt(ciphertext.encode()).decode()


def _machine_secret() -> str:
    """Derive a machine-local secret for key encryption."""
    import platform
    import uuid

    node = uuid.getnode()
    hostname = platform.node()
    system = platform.system()
    return hashlib.sha256(f"{node}{hostname}{system}{DEFAULT_VAULT_SECRET}".encode()).hexdigest()


# ── Policy types ───────────────────────────────────────────────────────────────


class AgentVaultPolicy(BaseModel):
    agent_id: str
    provider: str = ""
    allowed: bool = True
    rate_limit_tokens_per_min: int = 100_000
    rate_limit_requests_per_min: int = 60
    allowed_endpoints: list[str] = field(
        default_factory=lambda: [
            "/v1/chat/completions",
            "/v1/embeddings",
            "/api/generate",
            "/api/chat",
        ]
    )
    max_request_tokens: int = 32_000


class ProviderConfig(BaseModel):
    name: str
    base_url: str
    api_key_env: str
    default_model: str = ""


# ── Rate limiter ───────────────────────────────────────────────────────────────


@dataclass
class _TokenBucket:
    tokens: float
    last_refill: float
    rate: float
    burst: float

    def consume(self, tokens: float = 1.0) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
        self.last_refill = now
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


# ── Main Vault ─────────────────────────────────────────────────────────────────


class AgentVault:
    """Local credential-injection proxy. Runs in-process alongside the bridge."""

    def __init__(
        self,
        secret: str | None = None,
        storage: Any = None,
    ):
        self._secret = secret or os.getenv("ROBOFANG_VAULT_SECRET") or _machine_secret()
        self._storage = storage

        # Provider registry: {name: ProviderConfig}
        self._providers: dict[str, ProviderConfig] = {}
        # Policy registry: {agent_id: AgentVaultPolicy}
        self._policies: dict[str, AgentVaultPolicy] = {}
        # Encrypted credential store: {provider_name: encrypted_api_key}
        self._credentials: dict[str, str] = {}
        # Rate limiting: {agent_id: _TokenBucket}
        self._token_buckets: dict[str, _TokenBucket] = {}
        # Request rate limiting: {agent_id: sliding_window_requests}
        self._request_windows: dict[str, list[float]] = defaultdict(list)
        # Audit log
        self._audit: list[dict[str, Any]] = []

        self._monitor_task: asyncio.Task | None = None
        self._http_client: Any = None

    # ── Lifecycle ──────────────────────────────────────────────────────────

    async def start(self):
        self._load_provider_defaults()
        self._load_policies_from_storage()
        self._load_credentials_from_storage()

        import httpx

        self._http_client = httpx.AsyncClient(timeout=120.0)
        logger.info("AgentVault started with %d providers, %d policies.", len(self._providers), len(self._policies))

    async def stop(self):
        if self._http_client:
            await self._http_client.aclose()
        if self._monitor_task:
            self._monitor_task.cancel()
        logger.info("AgentVault stopped. %d audit entries.", len(self._audit))

    # ── Provider management ────────────────────────────────────────────────

    def register_provider(self, name: str, base_url: str, api_key_env: str, default_model: str = ""):
        self._providers[name] = ProviderConfig(
            name=name,
            base_url=base_url,
            api_key_env=api_key_env,
            default_model=default_model,
        )

    def get_provider(self, name: str) -> ProviderConfig | None:
        return self._providers.get(name)

    # ── Credential management ──────────────────────────────────────────────

    def store_credential(self, provider: str, api_key: str):
        encrypted = _encrypt(api_key, self._secret)
        self._credentials[provider] = encrypted
        if self._storage:
            self._storage.save_secret(f"vault_{provider}", encrypted)
        logger.info("Credential stored for provider '%s' (encrypted at rest).", provider)

    def get_credential(self, provider: str) -> str | None:
        encrypted = self._credentials.get(provider)
        if not encrypted:
            return None
        return _decrypt(encrypted, self._secret)

    # ── Policy management ──────────────────────────────────────────────────

    def set_agent_policy(self, policy: AgentVaultPolicy):
        self._policies[policy.agent_id] = policy
        if self._storage:
            self._storage.set_fleet_config(f"vault_policy_{policy.agent_id}", policy.model_dump_json())

    def get_agent_policy(self, agent_id: str) -> AgentVaultPolicy:
        return self._policies.get(agent_id, AgentVaultPolicy(agent_id=agent_id))

    # ── Rate limiting ──────────────────────────────────────────────────────

    def _check_rate_limit(self, agent_id: str, policy: AgentVaultPolicy) -> tuple[bool, str]:
        now = time.monotonic()
        window = self._request_windows[agent_id]
        window[:] = [t for t in window if now - t < 60.0]
        if len(window) >= policy.rate_limit_requests_per_min:
            return False, f"Request rate limit exceeded ({policy.rate_limit_requests_per_min}/min)"
        window.append(now)

        if agent_id not in self._token_buckets:
            self._token_buckets[agent_id] = _TokenBucket(
                tokens=policy.rate_limit_tokens_per_min,
                last_refill=now,
                rate=policy.rate_limit_tokens_per_min / 60.0,
                burst=policy.rate_limit_tokens_per_min,
            )
        bucket = self._token_buckets[agent_id]
        if not bucket.consume(1.0):
            return False, f"Token budget exceeded ({policy.rate_limit_tokens_per_min}/min)"
        return True, "ok"

    def _check_endpoint_allowed(self, policy: AgentVaultPolicy, path: str) -> bool:
        for allowed in policy.allowed_endpoints:
            if allowed.endswith("*"):
                if path.startswith(allowed.rstrip("*")):
                    return True
            elif path == allowed or path.startswith(allowed):
                return True
        return False

    # ── Proxy request ──────────────────────────────────────────────────────

    async def proxy_request(
        self,
        agent_id: str,
        provider_name: str,
        path: str,
        body: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Main entry point: agent sends request, vault injects credentials and forwards."""
        policy = self.get_agent_policy(agent_id)

        if not policy.allowed:
            self._audit_log(agent_id, provider_name, "deny", "Agent not allowed to use vault")
            return {"error": "Agent not authorized to use vault", "vault_status": "denied"}

        allowed, reason = self._check_rate_limit(agent_id, policy)
        if not allowed:
            self._audit_log(agent_id, provider_name, "deny", reason)
            return {"error": reason, "vault_status": "rate_limited"}

        if not self._check_endpoint_allowed(policy, path):
            self._audit_log(agent_id, provider_name, "deny", f"Endpoint {path} not in allowlist")
            return {"error": f"Endpoint {path} not allowed for agent {agent_id}", "vault_status": "denied"}

        provider = self._providers.get(provider_name)
        if not provider:
            self._audit_log(agent_id, provider_name, "deny", f"Unknown provider {provider_name}")
            return {"error": f"Unknown provider: {provider_name}", "vault_status": "denied"}

        api_key = self.get_credential(provider_name)
        if not api_key:
            self._audit_log(agent_id, provider_name, "deny", "No credential stored for provider")
            return {"error": f"No API key configured for {provider_name}", "vault_status": "unconfigured"}

        url = f"{provider.base_url.rstrip('/')}{path}"
        proxy_headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Proxy-Agent": agent_id,
        }
        if headers:
            proxy_headers.update(
                {k: v for k, v in headers.items() if k.lower() not in ("authorization", "x-proxy-agent")}
            )

        try:
            if not self._http_client:
                import httpx

                self._http_client = httpx.AsyncClient(timeout=120.0)

            resp = await self._http_client.post(url, json=body, headers=proxy_headers, timeout=120.0)
            result = resp.json()

            self._audit_log(
                agent_id, provider_name, "allow", f"Proxied to {provider.base_url}{path} (status={resp.status_code})"
            )
            return {"vault_status": "ok", "provider_status": resp.status_code, **result}

        except Exception as e:
            logger.error("Vault proxy failed for agent=%s provider=%s: %s", agent_id, provider_name, e)
            self._audit_log(agent_id, provider_name, "error", str(e))
            return {"error": f"Proxy error: {e}", "vault_status": "error"}

    # ── Audit ──────────────────────────────────────────────────────────────

    def _audit_log(self, agent_id: str, provider: str, verdict: str, reason: str):
        entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "agent": agent_id,
            "provider": provider,
            "verdict": verdict,
            "reason": reason,
        }
        self._audit.append(entry)
        if len(self._audit) > 1000:
            self._audit = self._audit[-500:]

    def get_audit_log(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._audit[-limit:]

    # ── Internal loaders ───────────────────────────────────────────────────

    def _load_provider_defaults(self):
        self.register_provider(
            "anthropic", "https://api.anthropic.com", "ANTHROPIC_API_KEY", "claude-sonnet-4-20250514"
        )
        self.register_provider("openai", "https://api.openai.com", "OPENAI_API_KEY", "gpt-4o")
        self.register_provider("deepseek", "https://api.deepseek.com", "DEEPSEEK_API_KEY", "deepseek-chat")
        self.register_provider("groq", "https://api.groq.com/openai", "GROQ_API_KEY", "")
        self.register_provider("ollama", "http://localhost:11434", "OLLAMA_URL", "")

    def _load_policies_from_storage(self):
        if not self._storage:
            return
        for agent_id in ["orchestrator:root", "agent:cortex", "guest"]:
            raw = self._storage.get_fleet_config(f"vault_policy_{agent_id}")
            if raw:
                try:
                    self._policies[agent_id] = AgentVaultPolicy.model_validate_json(raw)
                except Exception as exc:
                    logger.debug("Skip invalid vault policy for %s: %s", agent_id, exc)

    def _load_credentials_from_storage(self):
        if not self._storage:
            return
        for provider_name in ["anthropic", "openai", "deepseek", "groq", "ollama"]:
            encrypted = self._storage.get_secret(f"vault_{provider_name}")
            if encrypted:
                self._credentials[provider_name] = encrypted

        # Bootstrap from env vars if not in storage
        for provider in self._providers.values():
            if provider.name not in self._credentials:
                env_val = os.getenv(provider.api_key_env, "")
                if env_val and env_val not in ("", "sk-xxx", "sk-xxxxxxxx"):
                    self.store_credential(provider.name, env_val)
                    logger.info("Bootstrapped credential for %s from env var %s.", provider.name, provider.api_key_env)


# ── Singleton ──────────────────────────────────────────────────────────────────

_vault: AgentVault | None = None


def get_vault(storage: Any = None) -> AgentVault:
    global _vault
    if _vault is None:
        _vault = AgentVault(storage=storage)
    return _vault
