"""MCPBridgeConnector speaks real MCP (fastmcp.Client) - tested against an in-process FastMCP server."""

import pytest
from fastmcp import FastMCP

from robofang.core.connectors.bridge import MCPBridgeConnector


def _bridge() -> MCPBridgeConnector:
    mcp = FastMCP("bridge-test")

    @mcp.tool
    def echo(query: str) -> str:
        return f"echo:{query}"

    @mcp.tool
    def help_tool() -> str:
        return "help text"

    conn = MCPBridgeConnector("test", {"url": "http://unused", "auto_start": False})
    conn._url = mcp  # type: ignore[assignment]  # fastmcp.Client accepts an in-process server
    return conn


@pytest.mark.asyncio
async def test_bridge_connect_list_and_call():
    conn = _bridge()
    assert await conn.connect() is True
    names = {t["name"] for t in await conn.get_messages()}
    assert {"echo", "help_tool"} <= names
    assert await conn.call_tool("echo", {"query": "hi"}) == "echo:hi"
    assert await conn.send_message("echo", "plain text") is True


@pytest.mark.asyncio
async def test_bridge_unknown_tool_returns_none_and_false():
    conn = _bridge()
    await conn.connect()
    assert await conn.call_tool("nope", {}) is None
    assert await conn.send_message("nope", "x") is False


@pytest.mark.asyncio
async def test_bridge_unreachable_does_not_connect():
    conn = MCPBridgeConnector("dead", {"url": "http://127.0.0.1:9/mcp", "auto_start": False, "timeout": 2})
    assert await conn.connect() is False
    assert conn.active is False
