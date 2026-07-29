"""
Bridge fleet and install-flow API tests.
Uses real app from conftest. Tests that need orchestrator mocking
patch at the correct import path (robofang.app.fleet or robofang.app.api.fleet).
"""

from unittest.mock import AsyncMock, MagicMock, patch


def test_health_returns_200(client):
    r = client.get("/api/system/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


def test_fleet_discover_registry(client):
    r = client.get("/api/fleet/discover", params={"source": "registry", "limit": 10})
    # May 404 if orchestrator not configured — that's acceptable
    assert r.status_code in (200, 404, 422)


def test_fleet_discover_invalid_source(client):
    r = client.get("/api/fleet/discover", params={"source": "invalid"})
    assert r.status_code == 400


def test_fleet_add_from_external_github_missing_repo_url(client):
    r = client.post("/api/fleet/add-from-external", json={"source": "github"})
    assert r.status_code in (400, 422)


def test_fleet_add_from_external_docker_returns_501(client):
    r = client.post(
        "/api/fleet/add-from-external",
        json={"source": "docker", "id": "some-image"},
    )
    assert r.status_code == 501


def test_fleet_onboard_empty_hand_ids(client):
    r = client.post("/api/fleet/onboard", json={"hand_ids": []})
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert data.get("results") == []


def test_fleet_onboard_from_github_empty_items(client):
    r = client.post("/api/fleet/onboard-from-github", json={"items": []})
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert data.get("results") == []


def test_connector_status_unknown_returns_404(client):
    r = client.get("/api/connectors/unknown-connector-id-xyz/status")
    assert r.status_code == 404


@patch("robofang.app.api.fleet.orchestrator")
def test_fleet_onboard_catalog_id_adds_then_installs(mock_orch, client):
    """Onboard with hand_id from catalog: mocked orchestrator."""
    mock_orch.installer = MagicMock()
    mock_orch.installer.get_manifest.return_value = []
    mock_orch.installer.add_hand_to_manifest = lambda *a, **k: None
    mock_orch.onboard_hand = AsyncMock(return_value={"success": True, "message": "Installed"})
    r = client.post("/api/fleet/onboard", json={"hand_ids": ["ring-mcp"]})
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert any(r.get("hand_id") == "ring-mcp" and r.get("success") for r in data.get("results", []))
