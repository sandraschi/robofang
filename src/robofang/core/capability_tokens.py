"""Object Capabilities (ocaps) — tools as explicit capability tokens, not global strings.

Inspired by NanoClaw's flaw: agents with access to read email AND access to Slack
can be tricked by prompt injection into exfiltrating data. Ocaps fix this by making
tool access explicit, signed, and per-agent.

How it works:
    - Each Hand receives a set of CapabilityToken objects at startup
    - Tokens are HMAC-signed by the TokenAuthority
    - The orchestrator's execute_tool validates tokens before execution
    - Tokens can be revoked, scoped, and have rate limits

This directly replaces the global _tool_registry dict-based lookup with
a token-gated dispatch system.

The critical fix over NanoClaw: if an agent is "tainted" (e.g., received
an injected prompt), its tokens can be revoked immediately by the
SecurityManager, blocking all outbound tool calls.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger("robofang.capabilities")


class ToolScope(str, Enum):
    READ = "read"  # Can read but not mutate
    EXECUTE = "execute"  # Can execute the tool
    DELEGATE = "delegate"  # Can pass the capability to sub-agents
    ADMIN = "admin"  # Full control including scope modification


@dataclass
class CapabilityToken:
    """A signed token granting a specific tool to a specific agent."""

    token_id: str
    subject_id: str  # Which agent/hand holds this token
    tool_name: str  # The tool this grants access to
    scope: ToolScope = ToolScope.EXECUTE
    max_invocations: int | None = None
    expires_at: float | None = None  # Unix timestamp
    metadata: dict[str, Any] = field(default_factory=dict)

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at

    def to_payload(self) -> bytes:
        return json.dumps(
            {
                "tid": self.token_id,
                "sub": self.subject_id,
                "tool": self.tool_name,
                "scope": self.scope.value,
                "max": self.max_invocations,
                "exp": self.expires_at,
                "meta": self.metadata,
            },
            sort_keys=True,
        ).encode()


class TokenAuthority:
    """Creates, signs, and manages capability tokens."""

    def __init__(self, signing_secret: str | None = None):
        self._secret = (signing_secret or "rf-cap-secret-2026").encode()
        self._issued: dict[str, CapabilityToken] = {}  # token_id → token
        self._revoked: set[str] = set()  # token_ids
        self._by_subject: dict[str, set[str]] = {}  # subject_id → {token_ids}
        self._by_tool: dict[str, set[str]] = {}  # tool_name → {token_ids}
        self._invocation_count: dict[str, int] = {}  # token_id → count
        self._monitor: set[str] = set()  # Subjects under active monitoring

    def _sign(self, payload: bytes) -> str:
        return hmac.new(self._secret, payload, hashlib.sha256).hexdigest()[:16]

    def issue(
        self,
        subject_id: str,
        tool_name: str,
        scope: ToolScope = ToolScope.EXECUTE,
        max_invocations: int | None = None,
        expires_in: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> CapabilityToken:
        token_id = f"cap_{subject_id}_{tool_name}_{int(time.time() * 1000)}"
        expires_at = (time.time() + expires_in) if expires_in else None

        token = CapabilityToken(
            token_id=token_id,
            subject_id=subject_id,
            tool_name=tool_name,
            scope=scope,
            max_invocations=max_invocations,
            expires_at=expires_at,
            metadata=metadata or {},
        )

        self._issued[token_id] = token
        self._by_subject.setdefault(subject_id, set()).add(token_id)
        self._by_tool.setdefault(tool_name, set()).add(token_id)

        logger.info(
            "Capability issued: %s → %s (scope=%s, max=%s)", subject_id, tool_name, scope.value, max_invocations
        )
        return token

    def issue_batch(
        self,
        subject_id: str,
        tool_names: list[str],
        scope: ToolScope = ToolScope.EXECUTE,
        **kwargs,
    ) -> list[CapabilityToken]:
        return [self.issue(subject_id, name, scope, **kwargs) for name in tool_names]

    def revoke(self, token_id: str) -> bool:
        if token_id in self._revoked:
            return False
        self._revoked.add(token_id)
        logger.info("Capability revoked: %s", token_id)
        return True

    def revoke_all_for_subject(self, subject_id: str) -> int:
        """Revoke ALL capabilities for a subject. Used for tainted agent containment."""
        tokens = self._by_subject.get(subject_id, set())
        count = 0
        for tid in tokens:
            if self.revoke(tid):
                count += 1
        if count > 0:
            logger.warning("CONTAINMENT: Revoked %d capabilities for tainted subject '%s'.", count, subject_id)
        return count

    def revoke_tool_for_subject(self, subject_id: str, tool_name: str) -> int:
        """Revoke a specific tool capability for a subject."""
        tokens = self._by_subject.get(subject_id, set())
        count = 0
        for tid in tokens:
            token = self._issued.get(tid)
            if token and token.tool_name == tool_name:
                if self.revoke(tid):
                    count += 1
        return count

    def is_valid(self, token: CapabilityToken) -> tuple[bool, str]:
        """Check if a token is still valid for use. Returns (valid, reason)."""
        if token.token_id in self._revoked:
            return False, "Token has been revoked"
        if token.is_expired():
            return False, "Token has expired"
        if token.token_id not in self._issued:
            return False, "Token was not issued by this authority"
        if token.max_invocations is not None:
            used = self._invocation_count.get(token.token_id, 0)
            if used >= token.max_invocations:
                return False, f"Invocation limit reached ({token.max_invocations})"
        return True, "ok"

    def record_invocation(self, token_id: str):
        self._invocation_count[token_id] = self._invocation_count.get(token_id, 0) + 1

    def get_capabilities_for_subject(self, subject_id: str) -> list[CapabilityToken]:
        """List all valid capabilities held by a subject."""
        tokens = self._by_subject.get(subject_id, set())
        return [self._issued[tid] for tid in tokens if tid in self._issued and tid not in self._revoked]

    def get_tool_names_for_subject(self, subject_id: str) -> set[str]:
        """Get the set of tool names a subject has valid access to."""
        capabilities = self.get_capabilities_for_subject(subject_id)
        return {c.tool_name for c in capabilities}

    def subject_can_access(self, subject_id: str, tool_name: str) -> bool:
        """Quick check: does this subject have any valid token for this tool?

        Supports wildcard: a token with tool_name='*' grants access to all tools.
        """
        tool_names = self.get_tool_names_for_subject(subject_id)
        if "*" in tool_names:
            return True
        return tool_name in tool_names

    def mark_tainted(self, subject_id: str):
        """Mark a subject as tainted — revoke all caps and add to monitor list."""
        self._monitor.add(subject_id)
        self.revoke_all_for_subject(subject_id)
        logger.warning("TAINTAINED: Subject '%s' marked as tainted. All capabilities revoked.", subject_id)

    def clear_taint(self, subject_id: str):
        """Clear taint after session reset/verification. Does NOT restore caps."""
        self._monitor.discard(subject_id)
        logger.info("Taint cleared for subject '%s'.", subject_id)

    def is_tainted(self, subject_id: str) -> bool:
        return subject_id in self._monitor

    def stats(self) -> dict[str, Any]:
        return {
            "total_issued": len(self._issued),
            "total_revoked": len(self._revoked),
            "active_subjects": len(self._by_subject),
            "monitored_subjects": len(self._monitor),
            "unique_tools": len(self._by_tool),
        }


# ── Singleton ──────────────────────────────────────────────────────────────────

_authority: TokenAuthority | None = None


def get_authority(signing_secret: str | None = None) -> TokenAuthority:
    global _authority
    if _authority is None:
        _authority = TokenAuthority(signing_secret=signing_secret)
    return _authority
