"""
Bridge fleet and install-flow API tests.
Uses mocked orchestrator (see conftest); no real config or external services.
"""


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
