"""Tests for Capability Tokens (object capabilities / ocaps)."""

import time

import pytest
from robofang.core.capability_tokens import (
    CapabilityToken,
    TokenAuthority,
    ToolScope,
    get_authority,
)


@pytest.fixture
def authority():
    return TokenAuthority(signing_secret="test-secret-2026")


class TestTokenIssuance:
    def test_issue_single(self, authority):
        token = authority.issue("hand:collector", "system_dtu_stage", ToolScope.EXECUTE)
        assert token.token_id.startswith("cap_hand:collector_system_dtu_stage")
        assert token.subject_id == "hand:collector"
        assert token.tool_name == "system_dtu_stage"
        assert token.scope == ToolScope.EXECUTE

    def test_issue_batch(self, authority):
        tokens = authority.issue_batch(
            "hand:robotics",
            ["system_dtu_stage", "connector_yahboom", "connector_discord"],
            ToolScope.EXECUTE,
        )
        assert len(tokens) == 3
        assert all(t.subject_id == "hand:robotics" for t in tokens)
        assert {t.tool_name for t in tokens} == {"system_dtu_stage", "connector_yahboom", "connector_discord"}

    def test_issue_with_expiry(self, authority):
        token = authority.issue("hand:ephemeral", "skill_read", ToolScope.READ, expires_in=1)
        assert token.expires_at is not None
        assert not token.is_expired()
        time.sleep(1.1)
        assert token.is_expired()

    def test_issue_with_max_invocations(self, authority):
        token = authority.issue("hand:limited", "skill_read", ToolScope.READ, max_invocations=2)
        assert authority.is_valid(token) == (True, "ok")
        authority.record_invocation(token.token_id)
        authority.record_invocation(token.token_id)
        valid, reason = authority.is_valid(token)
        assert not valid
        assert "Invocation limit" in reason


class TestAccessControl:
    def test_subject_can_access(self, authority):
        authority.issue("hand:collector", "system_dtu_stage", ToolScope.EXECUTE)
        assert authority.subject_can_access("hand:collector", "system_dtu_stage")
        assert not authority.subject_can_access("hand:collector", "connector_email")

    def test_wildcard_token(self, authority):
        authority.issue("admin", "*", ToolScope.ADMIN)
        assert authority.subject_can_access("admin", "any_tool_whatsoever")
        assert authority.subject_can_access("admin", "connector_discord")

    def test_unknown_subject_denied(self, authority):
        assert not authority.subject_can_access("nonexistent", "any_tool")

    def test_revoke_token(self, authority):
        token = authority.issue("hand:test", "skill_test", ToolScope.EXECUTE)
        assert authority.subject_can_access("hand:test", "skill_test")
        authority.revoke(token.token_id)
        assert not authority.subject_can_access("hand:test", "skill_test")

    def test_revoke_all_for_subject(self, authority):
        authority.issue_batch("hand:test", ["tool_a", "tool_b", "tool_c"], ToolScope.EXECUTE)
        assert authority.subject_can_access("hand:test", "tool_a")
        authority.revoke_all_for_subject("hand:test")
        assert not authority.subject_can_access("hand:test", "tool_a")
        assert not authority.subject_can_access("hand:test", "tool_b")
        assert not authority.subject_can_access("hand:test", "tool_c")

    def test_revoke_tool_for_subject(self, authority):
        authority.issue_batch("hand:test", ["tool_a", "tool_b", "tool_c"], ToolScope.EXECUTE)
        authority.revoke_tool_for_subject("hand:test", "tool_a")
        assert not authority.subject_can_access("hand:test", "tool_a")
        assert authority.subject_can_access("hand:test", "tool_b")
        assert authority.subject_can_access("hand:test", "tool_c")


class TestTaintContainment:
    def test_mark_tainted_revokes_all(self, authority):
        authority.issue_batch("hand:test", ["tool_a", "tool_b"], ToolScope.EXECUTE)
        authority.mark_tainted("hand:test")
        assert authority.is_tainted("hand:test")
        assert not authority.subject_can_access("hand:test", "tool_a")
        assert not authority.subject_can_access("hand:test", "tool_b")

    def test_clear_taint(self, authority):
        authority.mark_tainted("hand:test")
        assert authority.is_tainted("hand:test")
        authority.clear_taint("hand:test")
        assert not authority.is_tainted("hand:test")

    def test_taint_adds_to_monitor(self, authority):
        authority.mark_tainted("hand:suspicious")
        stats = authority.stats()
        assert stats["monitored_subjects"] == 1
        assert stats["total_revoked"] >= 0


class TestCapabilityTokenValidation:
    def test_is_valid_ok(self, authority):
        token = authority.issue("hand:test", "tool_a", ToolScope.EXECUTE)
        valid, reason = authority.is_valid(token)
        assert valid
        assert reason == "ok"

    def test_is_valid_revoked(self, authority):
        token = authority.issue("hand:test", "tool_a", ToolScope.EXECUTE)
        authority.revoke(token.token_id)
        valid, reason = authority.is_valid(token)
        assert not valid
        assert "revoked" in reason.lower()

    def test_is_valid_expired(self, authority):
        token = authority.issue("hand:test", "tool_a", ToolScope.EXECUTE, expires_in=0.01)
        time.sleep(0.05)
        valid, reason = authority.is_valid(token)
        assert not valid
        assert "expired" in reason.lower()

    def test_unknown_token(self, authority):
        fake = CapabilityToken(token_id="fake", subject_id="x", tool_name="y")
        valid, reason = authority.is_valid(fake)
        assert not valid
        assert "was not issued" in reason.lower()


class TestCapabilityListing:
    def test_get_capabilities_for_subject(self, authority):
        authority.issue("hand:test", "tool_a")
        authority.issue("hand:test", "tool_b")
        caps = authority.get_capabilities_for_subject("hand:test")
        assert len(caps) == 2
        assert {c.tool_name for c in caps} == {"tool_a", "tool_b"}

    def test_get_tool_names(self, authority):
        authority.issue_batch("hand:test", ["a", "b", "c"])
        names = authority.get_tool_names_for_subject("hand:test")
        assert names == {"a", "b", "c"}


class TestSingleton:
    def test_get_authority(self):
        a1 = get_authority()
        a2 = get_authority()
        assert a1 is a2
