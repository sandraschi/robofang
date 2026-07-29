"""Pytest fixtures for RoboFang bridge API tests."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from robofang.main import app

collect_ignore = ["connectors/test_ring.py"]  # standalone script, not pytest


@pytest.fixture
def mock_orchestrator():
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
def client():
    """TestClient wrapping the real bridge app (no orchestrator mock)."""
    with TestClient(app) as c:
        yield c
