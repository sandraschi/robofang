"""Speech tools: onboard robot TTS + bridge to Speech-MCP. Adds robot playback and chaining on top of Speech-MCP."""

from __future__ import annotations

import os
from typing import Any

from fastmcp import FastMCP

ROBOT_BASE_URL = os.getenv("YAHBOOM_ROBOT_URL", "").rstrip("/")
SPEECH_MCP_BACKEND_URL = os.getenv("SPEECH_MCP_BACKEND_URL", "http://localhost:10918").rstrip("/")


def register_speech_tools(mcp: FastMCP) -> None:
    """
    Register speech tools that add to Speech-MCP:
    - robot_speech_say: send text to robot onboard TTS (Yahboom Voice Module).
    - speech_mcp_tts: call Speech-MCP for TTS, optionally send same text to robot (cloud → robot pipeline).
    """

    @mcp.tool()
    async def robot_speech_say(text: str) -> dict[str, Any]:
        """
        Say text on the robot using the onboard Yahboom Voice (ASR-TTS) module.
        Requires YAHBOOM_ROBOT_URL and a robot endpoint (e.g. POST /tts).
        """
        if not text or not text.strip():
            return {"success": False, "error": "text is empty"}
        if not ROBOT_BASE_URL:
            return {
                "success": False,
                "error": "YAHBOOM_ROBOT_URL not set",
                "hint": "Set robot HTTP/ROS2 bridge URL to send TTS to the car.",
            }
        try:
            import httpx

            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    f"{ROBOT_BASE_URL}/tts",
                    json={"text": text.strip()},
                )
                r.raise_for_status()
                return {"success": True, "text": text.strip(), "robot": ROBOT_BASE_URL}
        except Exception as e:
            return {"success": False, "error": str(e), "text": text.strip()}

    @mcp.tool()
    async def speech_mcp_tts(
        text: str,
        provider: str = "windows",
        send_to_robot: bool = False,
    ) -> dict[str, Any]:
        """
        Call Speech-MCP for TTS (Hume/ElevenLabs/Windows). If send_to_robot=true, also send the text to the robot onboard TTS.
        Adds a cloud→robot pipeline on top of Speech-MCP.
        """
        if not text or not text.strip():
            return {"success": False, "error": "text is empty"}
        try:
            import httpx

            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(
                    f"{SPEECH_MCP_BACKEND_URL}/api/v1/tts/wav",
                    params={"text": text.strip(), "provider": provider},
                )
                if r.status_code != 200:
                    return {
                        "success": False,
                        "error": f"Speech-MCP returned {r.status_code}",
                        "speech_mcp_url": SPEECH_MCP_BACKEND_URL,
                    }
                robot_out: dict[str, Any] = {}
                if send_to_robot and ROBOT_BASE_URL:
                    try:
                        r2 = await client.post(
                            f"{ROBOT_BASE_URL}/tts",
                            json={"text": text.strip()},
                        )
                        r2.raise_for_status()
                        robot_out = {"robot_said": True, "robot": ROBOT_BASE_URL}
                    except Exception as e:
                        robot_out = {"robot_said": False, "robot_error": str(e)}
                elif send_to_robot and not ROBOT_BASE_URL:
                    robot_out = {"robot_said": False, "robot_error": "YAHBOOM_ROBOT_URL not set"}
                return {
                    "success": True,
                    "provider": provider,
                    "text": text.strip(),
                    "speech_mcp_url": SPEECH_MCP_BACKEND_URL,
                    **robot_out,
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "speech_mcp_url": SPEECH_MCP_BACKEND_URL,
                "hint": "Ensure Speech-MCP backend is running and SPEECH_MCP_BACKEND_URL is correct.",
            }
