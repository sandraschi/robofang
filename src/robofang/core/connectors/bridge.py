"""MCP Bridge Connector."""

import asyncio
import logging
import subprocess
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class MCPBridgeConnector(BaseConnector):
    """Bridge to any FastMCP 2.14.x server running in HTTP transport mode.

    Instead of reimplementing the protocol layer (plexapi, calibredb, immich REST, etc.)
    inside RoboFang, we delegate to the dedicated MCP server that already owns that
    domain.  The MCP server is launched as a sidecar (or is already running) on a
    configurable port, and we speak to it via the MCP streamable-HTTP protocol.

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
        timeout     (int)  HTTP request timeout in seconds. Default: 30

    MCP JSON-RPC call format (streamable HTTP):
        POST <url>
        Content-Type: application/json
        { "jsonrpc": "2.0", "id": 1, "method": "tools/call",
          "params": { "name": "<tool>", "arguments": { ... } } }

    send_message() maps to a direct tool call:
        target  = tool name, e.g. "plex_library"
        content = JSON string of arguments, or plain string for "query"
        kwargs  = merged into arguments

    get_messages() calls the server's tools/list to return available tools,
    useful as a health check and discovery mechanism.
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
        self._client: Any | None = None  # httpx.AsyncClient

    async def connect(self) -> bool:
        import httpx

        self._client = httpx.AsyncClient(timeout=self._timeout)

        # Try to reach the server
        if await self._ping():
            self.active = True
            self.logger.info(f"MCPBridgeConnector '{self._name}' reachable at {self._url}")
            return True

        # Not up yet — optionally launch sidecar
        if self._auto_start and self._start_cmd:
            self.logger.info(f"Starting sidecar: {' '.join(self._start_cmd)}")
            await self._start_sidecar()
            # Give it a moment to bind
            await asyncio.sleep(2)
            if await self._ping():
                self.active = True
                self.logger.info(f"MCPBridgeConnector '{self._name}' sidecar up at {self._url}")
                return True
            self.logger.error(f"MCPBridgeConnector '{self._name}' sidecar didn't respond after start")
            return False

        self.logger.warning(f"MCPBridgeConnector '{self._name}' not reachable at {self._url}")
        return False

    async def disconnect(self) -> bool:
        if self._client:
            await self._client.aclose()
            self._client = None
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
        import json as _json

        if not self.active or not self._client:
            return False

        # Build arguments
        try:
            args = _json.loads(content) if content.strip().startswith("{") else {"query": content}
        except Exception:
            args = {"query": content}
        args.update(kwargs)

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": target, "arguments": args},
        }
        try:
            resp = await self._client.post(
                self._url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            result = resp.json()
            if "error" in result:
                self.logger.error(f"MCP tool error from '{self._name}': {result['error']}")
                return False
            return True
        except Exception as exc:
            self.logger.error(f"MCPBridgeConnector '{self._name}' send_message failed: {exc}")
            return False

    async def call_tool(self, tool: str, arguments: dict[str, Any] | None = None) -> Any:
        """Call a tool and return the result payload (not just bool)."""
        import json as _json

        if not self.active or not self._client:
            return None

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool, "arguments": arguments or {}},
        }
        try:
            resp = await self._client.post(
                self._url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            result = resp.json()
            if "error" in result:
                self.logger.error(f"MCP tool error: {result['error']}")
                return None
            # MCP returns content blocks: [{"type": "text", "text": "..."}]
            content_blocks = result.get("result", {}).get("content", [])
            texts = [b["text"] for b in content_blocks if b.get("type") == "text"]
            raw = "\n".join(texts)
            # Try JSON parse
            try:
                return _json.loads(raw)
            except Exception:
                return raw
        except Exception as exc:
            self.logger.error(f"MCPBridgeConnector '{self._name}' call_tool failed: {exc}")
            return None

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return the tool list from the bridged server — used as health/discovery."""
        if not self.active or not self._client:
            return []
        payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
        try:
            resp = await self._client.post(
                self._url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            result = resp.json()
            tools = result.get("result", {}).get("tools", [])
            return [{"name": t["name"], "description": t.get("description", "")[:120]} for t in tools[:limit]]
        except Exception as exc:
            self.logger.error(f"MCPBridgeConnector '{self._name}' tools/list failed: {exc}")
            return []

    async def ping(self) -> bool:
        """Liveness check via tools/list."""
        try:
            payload = {"jsonrpc": "2.0", "id": 0, "method": "tools/list", "params": {}}
            resp = await self._client.post(
                self._url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=5,
            )
            if resp.status_code != 200:
                return False
            data = resp.json()
            if "error" in data:
                return False
            tools = data.get("result", {}).get("tools", [])
            help_tool = None
            for t in tools:
                if "help" in t.get("name", "").lower():
                    help_tool = t["name"]
                    break
            if not help_tool:
                return resp.status_code == 200
            call_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {"name": help_tool, "arguments": {}},
            }
            call_resp = await self._client.post(
                self._url,
                json=call_payload,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            if call_resp.status_code != 200:
                return False
            call_data = call_resp.json()
            if "error" in call_data:
                return False
            content_blocks = call_data.get("result", {}).get("content", [])
            for b in content_blocks:
                if b.get("type") == "text" and (b.get("text") or "").strip():
                    return True
            return False
        except Exception:
            return False

    async def _start_sidecar(self):
        """Launch the MCP server as a background subprocess."""
        import os as _os

        env = _os.environ.copy()
        env.update(self._env)
        loop = asyncio.get_running_loop()
        proc = await loop.run_in_executor(
            None,
            lambda: subprocess.Popen(
                self._start_cmd,
                cwd=self._start_cwd,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            ),
        )
        self._proc = proc
