"""Robot control tools: status, patrol with recording."""

from __future__ import annotations

import os
from typing import Any

from fastmcp import FastMCP

# Optional: base URL of the robot (ROS2 HTTP bridge or Pi). If set, tools call it.
ROBOT_BASE_URL = os.getenv("YAHBOOM_ROBOT_URL", "").rstrip("/")


def register_robot_tools(mcp: FastMCP) -> None:
    """Register get_status and patrol_with_recording for bridge/dawn patrol."""

    @mcp.tool()
    async def get_status() -> dict[str, Any]:
        """
        Get robot status (battery, temperature, connection).
        Used by RoboFang Hub and bridge. If YAHBOOM_ROBOT_URL is set, fetches from robot; otherwise returns stub.
        """
        if ROBOT_BASE_URL:
            try:
                import httpx

                async with httpx.AsyncClient(timeout=5.0) as client:
                    r = await client.get(f"{ROBOT_BASE_URL}/status")
                    r.raise_for_status()
                    return r.json() if r.content else {"battery": 0, "temp": 0}
            except Exception as e:
                return {"battery": 0, "temp": 0, "error": str(e), "online": False}
        return {"battery": 72, "temp": 42, "online": True, "note": "stub (no YAHBOOM_ROBOT_URL)"}

    @mcp.tool()
    async def patrol_with_recording(duration_sec: int = 120) -> dict[str, Any]:
        """
        Run patrol with video recording. Used by dawn patrol routine.
        Returns video_path or video_url for downstream analysis. If no robot URL, returns stub.
        """
        if ROBOT_BASE_URL:
            try:
                import httpx

                async with httpx.AsyncClient(timeout=float(duration_sec + 30)) as client:
                    r = await client.post(
                        f"{ROBOT_BASE_URL}/patrol",
                        json={"duration_sec": duration_sec, "record": True},
                    )
                    r.raise_for_status()
                    out = r.json() if r.content else {}
                    return {
                        "success": True,
                        "video_path": out.get("video_path"),
                        "video_url": out.get("video_url"),
                        **out,
                    }
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {
            "success": True,
            "video_path": None,
            "video_url": None,
            "note": "stub (no YAHBOOM_ROBOT_URL); run real patrol on robot",
        }
