"""Tool routing: call a tool on a fleet MCP server by server name.

Resolves a server name to its streamable-HTTP endpoint and speaks real MCP via
fastmcp.Client (initialize handshake + session), which the fleet's FastMCP 3.x
servers require. Raw JSON-RPC POSTs are rejected by them (307/404/405).

Name resolution (first hit wins):
  1. federation_map connectors.<name>.mcp_backend (or .url)
  2. robofang.app.fleet.MCP_BACKENDS port map
Names are normalised: "telephony_mcp", "telephony-mcp", "connector_telephony" -> "telephony".
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 30.0


class ToolRoutingError(RuntimeError):
    """Raised when a server cannot be resolved or a tool call fails."""


def normalize_server_name(server: str) -> str:
    name = server.strip().lower().replace("_", "-")
    if name.startswith("connector-"):
        name = name[len("connector-") :]
    if name.endswith("-mcp"):
        name = name[: -len("-mcp")]
    return name


def mcp_endpoint(base_url: str) -> str:
    """Fleet servers mount streamable HTTP at /mcp."""
    url = base_url.rstrip("/")
    return url if url.endswith("/mcp") else f"{url}/mcp"


def extract_result(result: Any) -> Any:
    """Turn a fastmcp CallToolResult into plain data: typed data, structured content, or text."""
    if getattr(result, "data", None) is not None:
        return result.data
    if getattr(result, "structured_content", None):
        return result.structured_content
    texts = [getattr(block, "text", "") for block in getattr(result, "content", None) or []]
    raw = "\n".join(t for t in texts if t)
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return raw


async def call_mcp_tool(
    url: str, tool: str, arguments: dict[str, Any] | None = None, timeout: float = DEFAULT_TIMEOUT
) -> Any:
    """Call one tool on an MCP endpoint. Raises ToolRoutingError on transport or tool error."""
    from fastmcp import Client

    try:
        async with Client(url, timeout=timeout) as client:
            result = await client.call_tool(tool, arguments or {}, raise_on_error=True)
    except Exception as exc:
        raise ToolRoutingError(f"{tool} @ {url}: {type(exc).__name__}: {exc}") from exc
    return extract_result(result)


async def list_mcp_tools(url: str, timeout: float = DEFAULT_TIMEOUT) -> list[dict[str, str]]:
    """List tools on an MCP endpoint. Raises ToolRoutingError on failure."""
    from fastmcp import Client

    try:
        async with Client(url, timeout=timeout) as client:
            tools = await client.list_tools()
    except Exception as exc:
        raise ToolRoutingError(f"tools/list @ {url}: {type(exc).__name__}: {exc}") from exc
    return [{"name": t.name, "description": (t.description or "")[:120]} for t in tools]


class ToolRouter:
    """Routes (server, tool, arguments) to the right fleet MCP server."""

    def __init__(
        self,
        topology: dict[str, Any] | None = None,
        backends: dict[str, str] | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self._topology = topology
        self._backends = backends
        self.timeout = timeout

    def _backend_map(self) -> dict[str, str]:
        if self._backends is None:
            from robofang.app.fleet import MCP_BACKENDS  # lazy: app layer imports core

            self._backends = MCP_BACKENDS
        return self._backends

    def resolve(self, server: str) -> str:
        """Return the MCP endpoint URL for a server name, or raise ToolRoutingError."""
        name = normalize_server_name(server)
        connectors = (self._topology or {}).get("connectors", {})
        for key in (name, server):
            entry = connectors.get(key)
            if isinstance(entry, dict):
                url = entry.get("mcp_backend") or entry.get("url")
                if url:
                    return mcp_endpoint(url)
        url = self._backend_map().get(name)
        if url:
            return mcp_endpoint(url)
        raise ToolRoutingError(
            f"Unknown MCP server '{server}' (normalised '{name}'): not in federation_map or MCP_BACKENDS"
        )

    async def call(self, server: str, tool: str, arguments: dict[str, Any] | None = None) -> Any:
        url = self.resolve(server)
        logger.info("Tool call %s.%s -> %s", server, tool, url)
        return await call_mcp_tool(url, tool, arguments, self.timeout)

    async def list_tools(self, server: str) -> list[dict[str, str]]:
        return await list_mcp_tools(self.resolve(server), self.timeout)
