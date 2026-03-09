# robofang Connector Taxonomy

This is what differentiates robofang from OpenClaw and every other LLM orchestration
layer: real, sovereign, bidirectional control of a physical+digital environment.
OpenClaw routes messages. robofang controls things.

## Status Legend
- REAL     — fully implemented, tested
- PARTIAL  — implemented, some methods stub
- PLANNED  — designed, not yet coded
- STUB     — placeholder only

---

## Comms

| Connector     | Status  | Library          | Notes                              |
|---------------|---------|------------------|------------------------------------|
| moltbook      | REAL    | httpx (internal) | Sovereign journal + social         |
| email         | REAL    | stdlib only      | SMTP send + IMAP read              |
| discord       | REAL    | discord.py       | Bot, send+receive channel msgs     |
| slack         | PLANNED | slack-sdk        | Workspace bot                      |
| telegram      | PLANNED | python-telegram-bot | Personal bot                    |
| social        | STUB    | —                | Generic placeholder                |

---

## Physical Devices

| Connector       | Status  | Library       | Notes                                   |
|-----------------|---------|---------------|-----------------------------------------|
| tapo            | REAL    | python-kasa   | Smart plugs (P115 emeter), cameras      |
| hue             | REAL    | phue          | Philips Hue lights, groups, scenes      |
| shelly          | REAL    | httpx         | Gen1+Gen2 REST, power monitoring        |
| homeassistant   | REAL    | httpx         | All HA entities, services, automations  |
| ring            | REAL    | ring-doorbell | Motion events, video history            |
| netatmo         | PLANNED | pyatmo        | Weather station, indoor CO2/humidity    |
| dreame          | PLANNED | python-miio   | Dreame/Xiaomi vacuum control            |
| unitree_g1      | PLANNED | unitree-sdk   | Unitree G1 humanoid robot               |
| iot (generic)   | STUB    | —             | Deprecated — use specific connectors    |

---

## Media Consumers

| Connector | Status | Bridge         | Port | Notes                                    |
|-----------|--------|----------------|------|------------------------------------------|
| plex      | REAL   | plex-mcp HTTP  | 8101 | Library browse, sessions, playback ctrl  |
| calibre   | REAL   | calibre-mcp HTTP| 8102| 13k+ ebooks, search, Anna's Archive      |
| immich    | REAL   | immich-mcp HTTP| 8103 | Self-hosted photo library, OCR search    |

## Media Creators

| Connector | Status | Bridge           | Port | Notes                                  |
|-----------|--------|------------------|------|----------------------------------------|
| blender   | REAL   | blender-mcp HTTP | 8110 | Scene ctrl, render, Python console     |
| gimp      | REAL   | gimp-mcp HTTP    | 8111 | Script-Fu batch, filters, export       |
| inkscape  | REAL   | inkscape-mcp HTTP| 8112 | SVG, PDF, batch conversion             |

**All above use MCPBridgeConnector** — a single generic class that speaks MCP streamable HTTP.
robofang does not reimplement the protocol layer. Each MCP server stays sovereign.
Config: `configs/mcp_sidecars.json`. Test: `python tests/connectors/test_mcp_bridge.py [name|all]`

---

## Virtual Worlds & Simulation

| Connector      | Status  | Library/Method     | Notes                                 |
|----------------|---------|--------------------|---------------------------------------|
| resonite       | REAL    | WebSocket          | ResoniteLink protocol, world control  |
| vrchat         | PLANNED | httpx              | VRChat API (unofficial, stable)       |
| unity3d        | PLANNED | subprocess/REST    | Unity batch mode + Editor REST plugin |
| gazebo         | PLANNED | ros2 / gz REST     | Robot simulation                      |

---

## Workflow / Knowledge

| Connector        | Status  | Library/Method | Notes                                  |
|------------------|---------|----------------|----------------------------------------|
| homeassistant    | REAL    | httpx          | Also listed under Physical Devices     |
| advanced_memory  | PLANNED | httpx          | Local memops MCP REST bridge           |
| notion           | PLANNED | notion-client  | Notion pages and databases             |
| obsidian         | PLANNED | httpx          | Obsidian Local REST plugin             |

---

## Robotics

| Connector    | Status  | Library       | Notes                                      |
|--------------|---------|---------------|--------------------------------------------|
| dreame       | PLANNED | python-miio   | Dreame S20 Pro vacuum — map, zone clean    |
| unitree_g1   | PLANNED | unitree-sdk   | Full humanoid — joints, gait, sensors      |
| ros2_bridge  | PLANNED | rclpy         | Generic ROS2 topic/service bridge          |

---

## Installation

```powershell
# Core + currently implemented connectors
pip install -e ".[dev]"

# All connector deps at once
pip install python-kasa phue discord.py plexapi ring-doorbell
# (email, shelly, ha, calibre need no extra deps)

# Future
pip install pyatmo python-miio slack-sdk python-telegram-bot
```

## Architecture Notes

- All connectors use **deferred imports** — importing `BaseConnector` at startup
  has zero dependency weight. Libraries are loaded only when the connector is
  instantiated (i.e. when it appears in `enabled_connectors`).

- Connector selection priority in `orchestrator.py`:
  1. `ROBOFANG_CONNECTORS` env var (comma-separated)
  2. `topology["enabled_connectors"]` in `configs/federation_map.json`
  3. Per-connector `"enabled": true` flags in federation_map
  4. Empty (explicit opt-in required — no hardcoded fallbacks)

- Test scaffold: `python tests/connectors/run_all.py`
  Individual: `python tests/connectors/test_<name>.py`
