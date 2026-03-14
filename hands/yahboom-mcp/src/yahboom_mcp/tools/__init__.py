"""Yahboom MCP tools: robot control and speech."""

from yahboom_mcp.tools.robot import register_robot_tools
from yahboom_mcp.tools.speech import register_speech_tools

__all__ = ["register_robot_tools", "register_speech_tools"]
