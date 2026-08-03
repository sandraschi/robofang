"""Tests for the fleet events API (/api/v1/events) — aiwatcher alert sink."""

from unittest.mock import AsyncMock, MagicMock, patch


def _mock_orchestrator():
    m = MagicMock()
    m.storage.log_event = MagicMock(return_value=42)
    m.storage.get_audit_logs = MagicMock(return_value=[{"id": 42, "level": "warning", "source": "aiwatcher-mcp"}])
    return m


def test_post_event_stores(client):
    with patch("robofang.app.api.events.orchestrator", _mock_orchestrator()):
        r = client.post(
            "/api/v1/events",
            json={
                "source": "aiwatcher-mcp",
                "event": "BREAKING_AI_NEWS",
                "urgency": 9.2,
                "title": "DeepSeek V4 drops open weights",
                "url": "https://example.com",
                "summary": "Model released",
                "tags": ["china", "weights"],
                "timestamp": "2026-08-03T00:00:00Z",
            },
        )
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["event_id"] == 42
    assert data["stored"] is True


def test_post_event_notifies_when_urgent(client):
    orch = _mock_orchestrator()
    with (
        patch("robofang.app.api.events.orchestrator", orch),
        patch("robofang.app.api.events.notify", new=AsyncMock(return_value=True)) as mocked_notify,
    ):
        r = client.post(
            "/api/v1/events",
            json={"source": "aiwatcher-mcp", "event": "BREAKING_AI_NEWS", "urgency": 9.0, "title": "Big news"},
        )
    assert r.status_code == 200
    assert r.json()["notified"] is True
    mocked_notify.assert_awaited_once()
    assert "Big news" in mocked_notify.await_args.args[0]


def test_post_event_does_not_notify_below_threshold(client):
    orch = _mock_orchestrator()
    with (
        patch("robofang.app.api.events.orchestrator", orch),
        patch("robofang.app.api.events.notify", new=AsyncMock(return_value=True)) as mocked_notify,
    ):
        r = client.post(
            "/api/v1/events",
            json={"source": "email-mcp", "event": "EMAIL_ALERT", "urgency": 3.0, "title": "Low noise"},
        )
    assert r.status_code == 200
    assert r.json()["notified"] is False
    mocked_notify.assert_not_awaited()


def test_get_events_lists_recent(client):
    orch = _mock_orchestrator()
    with patch("robofang.app.api.events.orchestrator", orch):
        r = client.get("/api/v1/events", params={"limit": 10})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["count"] == 1
    assert data["events"][0]["id"] == 42


def test_events_router_mounted():
    """The events router is reachable through the real bridge app (via TestClient)."""
    from fastapi.testclient import TestClient

    from robofang.main import app

    with TestClient(app) as c:
        r = c.get("/openapi.json")
        assert r.status_code == 200
        paths = {p for p in r.json().get("paths", {})}
    assert "/api/v1/events" in paths


def test_post_event_notify_failure_is_non_fatal(client):
    orch = _mock_orchestrator()
    with (
        patch("robofang.app.api.events.orchestrator", orch),
        patch("robofang.app.api.events.notify", new=AsyncMock(side_effect=RuntimeError("no channel"))),
    ):
        r = client.post(
            "/api/v1/events",
            json={"source": "aiwatcher-mcp", "event": "X", "urgency": 9.5, "title": "Still stored"},
        )
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["stored"] is True
    assert data["notified"] is False
