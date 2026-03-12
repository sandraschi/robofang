"""
Pytest fixtures for RoboFang bridge API tests.
Mocks the orchestrator so tests do not require config, disk, or external services.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _make_mock_orchestrator():
    mock = MagicMock()
    mock.topology = {
        "connectors": {
            "blender": {"enabled": True, "mcp_backend": "http://localhost:10849"},
        },
        "domains": {},
    }
    mock.connectors = {
        "blender": MagicMock(connector_type="connector", active=True),
    }
    mock.storage = MagicMock()
    mock.storage.log_event = MagicMock(return_value=None)
    mock.update_topology = MagicMock(return_value=True)
    mock.start = AsyncMock(return_value=None)
    mock.stop = AsyncMock(return_value=None)
    mock.installer = MagicMock()
    mock.onboard_hand = AsyncMock(return_value={"success": True, "message": "OK"})
    return mock


@pytest.fixture
def mock_orchestrator():
    return _make_mock_orchestrator()


@pytest.fixture
def client(mock_orchestrator):
    """TestClient for the bridge app with orchestrator patched."""

    async def no_auto_launch():
        pass

    with (
        patch("robofang.main.orchestrator", mock_orchestrator),
        patch("robofang.main.auto_launch_enabled_connectors", side_effect=no_auto_launch),
    ):
        from robofang.main import app

        with TestClient(app) as c:
            yield c
