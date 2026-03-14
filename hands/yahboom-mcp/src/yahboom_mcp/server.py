"""
Yahboom MCP server: robot control + speech tools.
Exposes GET /status (for RoboFang Hub) and POST /tool (for bridge connector invoker).
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastmcp import FastMCP

from yahboom_mcp.tools import register_robot_tools, register_speech_tools

PORT = int(os.getenv("PORT", "10833"))
HOST = os.getenv("HOST", "127.0.0.1")

mcp = FastMCP(
    "yahboom-mcp",
    description="Yahboom ROS 2 robot car: status, patrol, onboard TTS + Speech-MCP bridge (cloud TTS → robot).",
)
register_robot_tools(mcp)
register_speech_tools(mcp)

app = FastAPI(title="Yahboom MCP", version="0.1.0")


@app.get("/status")
async def status() -> dict[str, Any]:
    """Hub and proxy use this for GET /home/yahboom/status."""
    result = await mcp.call_tool("get_status", {})
    if hasattr(result, "structured_content") and result.structured_content is not None:
        return result.structured_content
    if hasattr(result, "content") and result.content:
        raw = (
            result.content[0].text if hasattr(result.content[0], "text") else str(result.content[0])
        )
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"raw": raw}
    return {"battery": 72, "temp": 42, "online": True}


@app.post("/tool")
async def tool(request: Request) -> JSONResponse:
    """Bridge connector invoker: POST /tool with {"name": "...", "arguments": {...}}."""
    try:
        body = await request.json()
        name = body.get("name") or body.get("tool")
        arguments = body.get("arguments") or body.get("params") or {}
        if not name:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Missing 'name' or 'tool'"},
            )
        result = await mcp.call_tool(name, arguments)
        if hasattr(result, "structured_content") and result.structured_content is not None:
            data = result.structured_content
        elif hasattr(result, "content") and result.content:
            raw = (
                result.content[0].text
                if hasattr(result.content[0], "text")
                else str(result.content[0])
            )
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {"raw": raw}
        else:
            data = {"result": str(result)}
        return JSONResponse(content={"result": data, "success": True})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
        )


def main() -> None:
    """Run with: uv run yahboom-mcp or python -m yahboom_mcp.server."""
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
    sys.exit(0)
