"""Tests for Agent Vault (credential-injection proxy)."""

import pytest
from robofang.core.credential_vault import (
    AgentVault,
    AgentVaultPolicy,
    get_vault,
)


@pytest.fixture
def vault():
    v = AgentVault(secret="test-secret-2026")
    v._load_provider_defaults()
    return v


class TestCredentialStorage:
    def test_store_and_get(self, vault):
        vault.store_credential("anthropic", "sk-ant-test123")
        assert vault.get_credential("anthropic") == "sk-ant-test123"

    def test_get_nonexistent(self, vault):
        assert vault.get_credential("nonexistent") is None

    def test_encryption_is_applied(self, vault):
        vault.store_credential("openai", "sk-openai-test")
        raw = vault._credentials.get("openai")
        assert raw is not None
        # raw should be encrypted (Fernet token), not the plain key
        assert "sk-openai" not in raw
        # but decrypted should match
        assert vault.get_credential("openai") == "sk-openai-test"

    def test_get_credential_roundtrip(self, vault):
        vault.store_credential("deepseek", "sk-ds-secret")
        assert vault.get_credential("deepseek") == "sk-ds-secret"

    def test_overwrite_credential(self, vault):
        vault.store_credential("groq", "old-key")
        vault.store_credential("groq", "new-key")
        assert vault.get_credential("groq") == "new-key"


class TestProviderConfig:
    def test_register_provider(self, vault):
        vault.register_provider("test-llm", "https://api.test.com", "TEST_API_KEY", "test-model")
        provider = vault.get_provider("test-llm")
        assert provider is not None
        assert provider.base_url == "https://api.test.com"
        assert provider.api_key_env == "TEST_API_KEY"

    def test_default_providers_loaded(self, vault):
        assert vault.get_provider("anthropic") is not None
        assert vault.get_provider("openai") is not None
        assert vault.get_provider("deepseek") is not None
        assert vault.get_provider("ollama") is not None

    def test_get_unknown_provider(self, vault):
        assert vault.get_provider("nonexistent") is None


class TestPolicyManagement:
    def test_set_agent_policy(self, vault):
        policy = AgentVaultPolicy(
            agent_id="hand:collector",
            provider="ollama",
            rate_limit_tokens_per_min=1000,
            rate_limit_requests_per_min=10,
        )
        vault.set_agent_policy(policy)
        retrieved = vault.get_agent_policy("hand:collector")
        assert retrieved.agent_id == "hand:collector"
        assert retrieved.rate_limit_tokens_per_min == 1000
        assert retrieved.rate_limit_requests_per_min == 10

    def test_default_policy(self, vault):
        policy = vault.get_agent_policy("nonexistent")
        assert policy.allowed is True
        assert policy.rate_limit_requests_per_min == 60


class TestRateLimiting:
    def test_request_rate_limit_exceeded(self, vault):
        policy = AgentVaultPolicy(
            agent_id="hand:test",
            provider="ollama",
            rate_limit_requests_per_min=2,
            rate_limit_tokens_per_min=100000,
        )
        allowed, reason = vault._check_rate_limit("hand:test", policy)
        assert allowed is True
        allowed, reason = vault._check_rate_limit("hand:test", policy)
        assert allowed is True
        # Third call within the same window should exceed
        allowed, reason = vault._check_rate_limit("hand:test", policy)
        assert allowed is False
        assert "rate limit exceeded" in reason.lower()


class TestEndpointAllowlist:
    def test_endpoint_allowed(self, vault):
        policy = AgentVaultPolicy(
            agent_id="hand:test",
            provider="ollama",
            allowed_endpoints=["/v1/chat/completions", "/api/chat"],
        )
        assert vault._check_endpoint_allowed(policy, "/v1/chat/completions")
        assert vault._check_endpoint_allowed(policy, "/api/chat")

    def test_endpoint_denied(self, vault):
        policy = AgentVaultPolicy(
            agent_id="hand:test",
            provider="ollama",
            allowed_endpoints=["/v1/chat/completions"],
        )
        assert not vault._check_endpoint_allowed(policy, "/v1/embeddings")

    def test_endpoint_wildcard(self, vault):
        policy = AgentVaultPolicy(
            agent_id="hand:test",
            provider="ollama",
            allowed_endpoints=["/api/*"],
        )
        assert vault._check_endpoint_allowed(policy, "/api/chat")
        assert vault._check_endpoint_allowed(policy, "/api/generate")
        assert not vault._check_endpoint_allowed(policy, "/v1/chat/completions")


class TestAuditLog:
    def test_audit_entries(self, vault):
        vault._audit_log("hand:test", "ollama", "deny", "test reason")
        vault._audit_log("hand:test", "anthropic", "allow", "proxied OK")
        log = vault.get_audit_log()
        assert len(log) == 2
        assert log[0]["agent"] == "hand:test"
        assert log[0]["verdict"] == "deny"

    def test_audit_capped(self, vault):
        for i in range(2000):
            vault._audit_log(f"hand:{i}", "test", "allow", f"entry {i}")
        log = vault.get_audit_log()
        assert len(log) <= 1000


class TestSingleton:
    def test_get_vault(self):
        v1 = get_vault()
        v2 = get_vault()
        assert v1 is v2
