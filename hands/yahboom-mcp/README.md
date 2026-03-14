# Yahboom MCP

Yahboom ROS 2 robot car: status, patrol, and speech tools (onboard TTS + Speech-MCP bridge).

## Tools

- **get_status** — Robot status (battery, temp). Hub uses GET `/status`.
- **patrol_with_recording** — Dawn patrol; returns `video_path` / `video_url`. Bridge calls POST `/tool`.
- **robot_speech_say(text)** — Send text to robot onboard Yahboom Voice (ASR-TTS) module. Requires `YAHBOOM_ROBOT_URL`.
- **speech_mcp_tts(text, provider, send_to_robot)** — Call Speech-MCP for TTS; optionally play same text on robot.

## Run

```powershell
cd hands\yahboom-mcp
uv sync
uv run yahboom-mcp
```

Default port **10833**. Env: `YAHBOOM_ROBOT_URL`, `SPEECH_MCP_BACKEND_URL` (default `http://localhost:10918`).

## Docs

- RoboFang: [ROBOTICS.md](../../docs/ROBOTICS.md) (speech and audio), [ROUTINES_DAWN_PATROL.md](../../docs/ROUTINES_DAWN_PATROL.md).
- Speech-MCP: Yahboom voice module and bridge pattern — see Speech-MCP repo `YAHBOOM_RASPBOT_VOICE.md`.
