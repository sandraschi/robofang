"""Tests for robofang.core.tool_router (real MCP protocol via in-process FastMCP server)."""

import pytest
from fastmcp import FastMCP

from robofang.core.hands import HandsManager
from robofang.core.tool_router import (
    ToolRouter,
    ToolRoutingError,
    call_mcp_tool,
    mcp_endpoint,
    normalize_server_name,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("telephony_mcp", "telephony"),
        ("telephony-mcp", "telephony"),
        ("connector_moltbook", "moltbook"),
        ("Home_Assistant", "home-assistant"),
        ("yahboom", "yahboom"),
    ],
)
def test_normalize_server_name(raw, expected):
    assert normalize_server_name(raw) == expected


def test_mcp_endpoint_appends_mcp_once():
    assert mcp_endpoint("http://localhost:10720") == "http://localhost:10720/mcp"
    assert mcp_endpoint("http://localhost:10720/") == "http://localhost:10720/mcp"
    assert mcp_endpoint("http://localhost:10720/mcp") == "http://localhost:10720/mcp"


def test_resolve_prefers_federation_map_over_port_map():
    router = ToolRouter(
        topology={"connectors": {"calibre": {"mcp_backend": "http://localhost:19999"}}},
        backends={"calibre": "http://localhost:10720"},
    )
    assert router.resolve("calibre_mcp") == "http://localhost:19999/mcp"


def test_resolve_falls_back_to_port_map():
    router = ToolRouter(topology={"connectors": {}}, backends={"yahboom": "http://localhost:10892"})
    assert router.resolve("yahboom") == "http://localhost:10892/mcp"


def test_resolve_unknown_server_raises():
    router = ToolRouter(topology={}, backends={})
    with pytest.raises(ToolRoutingError, match="Unknown MCP server 'telephony_mcp'"):
        router.resolve("telephony_mcp")


def _server() -> FastMCP:
    mcp = FastMCP("router-test")

    @mcp.tool
    def add(a: int, b: int) -> int:
        return a + b

    @mcp.tool
    def boom() -> str:
        raise ValueError("kaput")

    return mcp


@pytest.mark.asyncio
async def test_call_mcp_tool_returns_typed_data():
    assert await call_mcp_tool(_server(), "add", {"a": 2, "b": 3}) == 5  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_call_mcp_tool_wraps_tool_errors():
    with pytest.raises(ToolRoutingError, match="boom"):
        await call_mcp_tool(_server(), "boom")  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_call_mcp_tool_unreachable_raises():
    with pytest.raises(ToolRoutingError):
        await call_mcp_tool("http://127.0.0.1:9/mcp", "add", {"a": 1, "b": 1}, timeout=2)


@pytest.mark.asyncio
async def test_hands_manager_call_tool_unknown_server_raises():
    class _Orch:
        def __init__(self):
            self.topology = {"connectors": {}}

    hands = HandsManager(_Orch())
    hands._router = ToolRouter(topology={}, backends={})
    with pytest.raises(ToolRoutingError):
        await hands.call_tool("telephony_mcp", "place_call", {})
