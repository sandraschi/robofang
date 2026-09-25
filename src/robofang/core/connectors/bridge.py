"""MCP Bridge Connector."""

import asyncio
import json
import logging
import subprocess
from typing import Any

from robofang.core.tool_router import ToolRoutingError, call_mcp_tool, list_mcp_tools

from .base import BaseConnector

logger = logging.getLogger(__name__)


class MCPBridgeConnector(BaseConnector):
    """Bridge to any FastMCP server running in streamable-HTTP transport mode.

    Instead of reimplementing the protocol layer (plexapi, calibredb, immich REST, etc.)
    inside RoboFang, we delegate to the dedicated MCP server that already owns that
    domain.  The MCP server is launched as a sidecar (or is already running) on a
    configurable port, and we speak real MCP to it via fastmcp.Client
    (initialize handshake + session - raw JSON-RPC POSTs are rejected by FastMCP 3.x).

    Config keys:
        name        (str)  Human label, e.g. "plex-mcp"
        url         (str)  Base URL of the MCP HTTP endpoint,
                           e.g. "http://127.0.0.1:8100/mcp"
        start_cmd   (list) Optional: command to launch the sidecar if not already up,
                           e.g. ["python", "-m", "plex_mcp", "--http", "--port", "8100"]
        start_cwd   (str)  Working directory for start_cmd
        env         (dict) Extra env vars passed to the sidecar process
        auto_start  (bool) If True, launch the sidecar on connect() if not reachable.
                           Default: True
        timeout     (int)  Request timeout in seconds. Default: 30

    send_message() maps to a direct tool call:
        target  = tool name, e.g. "plex_library"
        content = JSON string of arguments, or plain string for "query"
        kwargs  = merged into arguments

    get_messages() returns the server's tool list, useful as a health check and
    discovery mechanism.
    """

    connector_type = "mcp_bridge"

    def __init__(self, connector_id: str, config: dict[str, Any]):
        super().__init__(connector_id, config)
        # SOTA: Prioritize 'mcp_backend' from federation_map over generic 'url'
        backend_url = config.get("mcp_backend") or config.get("url") or "http://127.0.0.1:8000/mcp"

        # Normalize URL: Ensure it ends with /mcp if it's a bridge to one of our FastMCP servers
        if not backend_url.endswith("/mcp") and ":10" in backend_url:
            backend_url = f"{backend_url.rstrip('/')}/mcp"

        self._url: str = backend_url
        self._name: str = config.get("name", connector_id)
        self._start_cmd: list[str] | None = config.get("start_cmd")
        self._start_cwd: str | None = config.get("start_cwd")
        self._env: dict[str, str] = config.get("env", {})
        self._auto_start: bool = config.get("auto_start", True)
        self._timeout: int = config.get("timeout", 30)
        self._proc: Any | None = None  # subprocess.Popen if we launched it

    async def connect(self) -> bool:
        # Try to reach the server
        if await self.ping():
            self.active = True
            self.logger.info(f"MCPBridgeConnector '{self._name}' reachable at {self._url}")
            return True

        # Not up yet - optionally launch sidecar
        if self._auto_start and self._start_cmd:
            self.logger.info(f"Starting sidecar: {' '.join(self._start_cmd)}")
            await self._start_sidecar()
            # Give it a moment to bind
            await asyncio.sleep(2)
            if await self.ping():
                self.active = True
                self.logger.info(f"MCPBridgeConnector '{self._name}' sidecar up at {self._url}")
                return True
            self.logger.error(f"MCPBridgeConnector '{self._name}' sidecar didn't respond after start")
            return False

        self.logger.warning(f"MCPBridgeConnector '{self._name}' not reachable at {self._url}")
        return False

    async def disconnect(self) -> bool:
        if self._proc and self._proc.returncode is None:
            self.logger.info(f"Stopping sidecar '{self._name}'")
            self._proc.terminate()
            try:
                self._proc.wait(timeout=5)
            except Exception:
                self._proc.kill()
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Call a tool on the bridged MCP server."""
        if not self.active:
            return False

        # Build arguments
        try:
            args = json.loads(content) if content.strip().startswith("{") else {"query": content}
        except ValueError:
            args = {"query": content}
        args.update(kwargs)

        try:
            await call_mcp_tool(self._url, target, args, self._timeout)
            return True
        except ToolRoutingError as exc:
            self.logger.error(f"MCPBridgeConnector '{self._name}' send_message failed: {exc}")
            return False

    async def call_tool(self, tool: str, arguments: dict[str, Any] | None = None) -> Any:
        """Call a tool and return the result payload (None on failure)."""
        if not self.active:
            return None
        try:
            return await call_mcp_tool(self._url, tool, arguments, self._timeout)
        except ToolRoutingError as exc:
            self.logger.error(f"MCPBridgeConnector '{self._name}' call_tool failed: {exc}")
            return None

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return the tool list from the bridged server - used as health/discovery."""
        if not self.active:
            return []
        try:
            return (await list_mcp_tools(self._url, self._timeout))[:limit]
        except ToolRoutingError as exc:
            self.logger.error(f"MCPBridgeConnector '{self._name}' tools/list failed: {exc}")
            return []

    async def ping(self) -> bool:
        """Liveness check: tools/list, plus a non-empty answer from the server's help tool if it has one."""
        try:
            tools = await list_mcp_tools(self._url, timeout=5)
            help_tool = next((t["name"] for t in tools if "help" in t["name"].lower()), None)
            if not help_tool:
                return True
            result = await call_mcp_tool(self._url, help_tool, {}, timeout=10)
            return bool(result)
        except ToolRoutingError:
            return False

    async def _start_sidecar(self):
        """Launch the MCP server as a background subprocess."""
        import os as _os

        start_cmd = self._start_cmd
        if not start_cmd:
            return
        env = _os.environ.copy()
        env.update(self._env)
        loop = asyncio.get_running_loop()
        proc = await loop.run_in_executor(
            None,
            lambda: subprocess.Popen(
                start_cmd,
                cwd=self._start_cwd,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            ),
        )
        self._proc = proc
