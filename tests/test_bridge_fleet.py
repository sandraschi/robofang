"""
Bridge fleet and install-flow API tests.
Uses mocked orchestrator (see conftest); no real config or external services.
"""

from unittest.mock import AsyncMock, MagicMock, patch


def test_fleet_returns_200_and_shape(client):
    r = client.get("/fleet")
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert "summary" in data
    assert "connectors" in data
    assert "agents" in data
    assert "connectors_online" in data["summary"]
    assert "connectors_total" in data["summary"]


def test_register_connector_returns_200(client):
    r = client.post(
        "/api/fleet/register",
        json={
            "category": "connectors",
            "id": "test-connector",
            "config": {"enabled": True, "mcp_backend": "http://localhost:9999"},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert "test-connector" in data.get("message", "")


def test_register_connector_minimal_config(client):
    r = client.post(
        "/api/fleet/register",
        json={
            "category": "connectors",
            "id": "another",
            "config": {"mcp_backend": "http://localhost:8888"},
        },
    )
    assert r.status_code == 200
    assert r.json().get("success") is True


def test_connector_status_unknown_returns_404(client):
    r = client.get("/api/connectors/unknown-connector-id-xyz/status")
    assert r.status_code == 404


def test_health_returns_200(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "healthy"


@patch("robofang.main.discover_docker", return_value=[])
@patch("robofang.main.discover_registry", new_callable=AsyncMock, return_value=[])
def test_fleet_discover_registry(mock_registry, mock_docker, client):
    r = client.get("/api/fleet/discover", params={"source": "registry", "limit": 10})
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert data.get("source") == "registry"
    assert "items" in data
    mock_registry.assert_called_once()
    assert mock_registry.call_args.kwargs.get("limit") == 10


@patch(
    "robofang.main.discover_docker", return_value=[{"id": "foo", "name": "foo", "source": "docker"}]
)
@patch("robofang.main.discover_registry", new_callable=AsyncMock, return_value=[])
def test_fleet_discover_docker(mock_registry, mock_docker, client):
    r = client.get("/api/fleet/discover", params={"source": "docker"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert data.get("source") == "docker"
    assert data.get("items") == [{"id": "foo", "name": "foo", "source": "docker"}]
    mock_docker.assert_called_once()


def test_fleet_discover_invalid_source(client):
    r = client.get("/api/fleet/discover", params={"source": "invalid"})
    assert r.status_code == 400


def test_fleet_add_from_external_github(client):
    r = client.post(
        "/api/fleet/add-from-external",
        json={"source": "github", "repo_url": "https://github.com/owner/my-mcp"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert "my-mcp" in data.get("message", "")
    assert data.get("install_result", {}).get("success") is True


def test_fleet_add_from_external_github_missing_repo_url(client):
    r = client.post("/api/fleet/add-from-external", json={"source": "github"})
    assert r.status_code == 422


def test_fleet_add_from_external_docker_returns_501(client):
    r = client.post(
        "/api/fleet/add-from-external",
        json={"source": "docker", "id": "some-image"},
    )
    assert r.status_code == 501


# --- MCP server install from GitHub (onboard / onboard-from-github) ---


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


def test_fleet_onboard_from_github_with_repo_url(client):
    """Install MCP from GitHub by repo_url: add to manifest then onboard (mocked)."""
    r = client.post(
        "/api/fleet/onboard-from-github",
        json={
            "items": [
                {
                    "repo_url": "https://github.com/owner/my-mcp",
                    "id": "my-mcp",
                    "name": "My MCP",
                    "category": "Other",
                }
            ]
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0].get("hand_id") == "my-mcp"
    assert data["results"][0].get("success") is True


@patch("robofang.main.orchestrator")
def test_fleet_onboard_catalog_id_adds_then_installs(mock_orch, client):
    """Onboard with hand_id from catalog: get_manifest empty so add to manifest then onboard (mocked)."""
    mock_orch.installer = MagicMock()
    mock_orch.installer.get_manifest.return_value = []
    mock_orch.installer.add_hand_to_manifest = lambda *a, **k: None
    mock_orch.onboard_hand = AsyncMock(return_value={"success": True, "message": "Installed"})
    r = client.post("/api/fleet/onboard", json={"hand_ids": ["ring-mcp"]})
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert any(r.get("hand_id") == "ring-mcp" and r.get("success") for r in data.get("results", []))
