# robofang Connector Taxonomy

This is what differentiates robofang from OpenClaw and every other LLM orchestration
layer: real, sovereign, bidirectional control of a physical+digital environment.
OpenClaw routes messages. robofang controls things.

## Status Legend
- REAL     — fully implemented, tested
- BETA     — official support, early/beta quality (e.g. Resonite SDK for Unity)
- PARTIAL  — implemented, some methods stub
- PLANNED  — designed, not yet coded
- NOT IMPLEMENTED — no implementation; use an alternative connector
- DEPRECATED — do not use; use replacement

---

## Comms

| Connector     | Status  | Library          | Notes                              |
|---------------|---------|------------------|------------------------------------|
| moltbook      | REAL    | httpx (internal) | Sovereign journal + social         |
| email         | REAL    | stdlib only      | SMTP send + IMAP read              |
| discord       | REAL    | discord.py       | Bot, send+receive channel msgs. Optional **agents channel**: `agents_channel_id` in connectors.discord or env `ROBOFANG_DISCORD_AGENTS_CHANNEL_ID`; idle agents post there (~10 min cooldown). See [AGENTS_CHANNEL_AND_MOLTBOOK.md](AGENTS_CHANNEL_AND_MOLTBOOK.md) for prose, debate, researcher/Readly/arxiv. |
| slack         | REAL    | slack-sdk        | Workspace bot; token + channel_id  |
| telegram      | PLANNED | python-telegram-bot | Personal bot                    |
| social        | NOT IMPLEMENTED | —            | Use discord or slack connector    |

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
| iot (generic)   | DEPRECATED | —          | Use TapoConnector, HueConnector, or ShellyConnector |

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
| resonite       | REAL    | WebSocket          | ResoniteLink protocol, world control. Authoring: [Resonite SDK (Unity) beta](integrations/resonite.md#resonite-sdk-unity-editor-beta). |
| vrchat         | PLANNED | httpx              | VRChat API (unofficial, stable)       |
| unity3d        | BETA    | Resonite SDK + MCP | [Resonite SDK (Unity) beta](integrations/unity3d.md#resonite-sdk-unity) for worlds/gadgets/avatars; unity3d-mcp for batch/Editor. See [Integration: Unity3D](integrations/unity3d.md). |
| gazebo         | PLANNED | ros2 / gz REST     | Robot simulation                      |

### Resonite SDK (Unity Editor) — beta (2026.3.11.1400+)

As of **2026.3.11.1400**, Resonite ships an **official SDK (beta) for the Unity Editor**. It provides an alternative authoring path for Resonite content and makes it easy to bring existing Unity projects into Resonite.

- **Scope**: Build **worlds**, **gadgets**, and **avatars** in Unity; convert and export for use in Resonite.
- **State**: Beta — expect some jank; for hassle-free use, consider waiting for stabilization.
- **License**: Fully **open source**; modular, extensible **conversion system** (community issues and PRs welcome).
- **Upstream**: [Yellow-Dog-Man/Resonite.UnitySDK](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK) (releases v0.0.1–v0.0.3). Requires a Resonite client build that includes the SDK announcement (2026.3.11.1400 or later).
- **RoboFang**: Runtime control remains via **resonite** connector (ResoniteLink/OSC) and [resonite-mcp](mcp-servers/resonite-mcp.md). The SDK covers **authoring**; the **unity3d** connector status is **BETA** for this official authoring path. See [Integration: Resonite](integrations/resonite.md) and [Integration: Unity3D](integrations/unity3d.md) for detailed API and MCP crosslinks.

---

## Workflow / Knowledge

| Connector        | Status  | Library/Method | Notes                                  |
|------------------|---------|----------------|----------------------------------------|
| homeassistant    | REAL    | httpx          | Also listed under Physical Devices     |
| advanced_memory  | REAL    | MCPBridgeConnector | Memops MCP REST bridge; see [MEMOPS_STATUS.md](MEMOPS_STATUS.md) |
| notion           | PLANNED | notion-client  | Notion pages and databases             |
| obsidian         | PLANNED | httpx          | Obsidian Local REST plugin             |

---

## Robotics

| Connector    | Status  | Library/Method | Notes                                                                 |
|--------------|---------|----------------|-----------------------------------------------------------------------|
| yahboom      | REAL    | hands/yahboom-mcp | Yahboom ROS 2 robocar: get_status, patrol_with_recording; speech tools (robot_speech_say, speech_mcp_tts bridge to Speech-MCP). Port 10833. |
| dreame       | PLANNED | python-miio   | Dreame vacuum — map, zone clean; audio is preset phrases/voice packs only, no arbitrary TTS. |
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

# Optional (slack is in main deps)
pip install pyatmo python-miio python-telegram-bot
```

---

## Autonomous Hands (Service Fleet)

The RoboFang fleet consists of specialized autonomous agents ("Hands") that execute scheduled pulsative reasoning over the connector grid.

| Hand | Category | Primary Focus | Status |
|------|----------|---------------|--------|
| **Musician** | content | AI Generation + Virtual DJ/Reaper orchestration | REAL |
| **Patroller** | security | Security monitoring (Tapo/Ring) | REAL |
| **Doctor** | productivity | Medical diagnostic reasoning | REAL |
| **Avatar** | communication | Social VR presence (VRChat/Resonite) | REAL |
| **Housemaker** | content | Domestic & Simulation automation | REAL |
| **Dancer** | productivity | Creative performance & OSC sync | REAL |
| **P.A.** | productivity | Scheduling, Inbox, Annoyance protocols | REAL |
| **Cook** | productivity | Kitchen automation (Microwave primitive) | REAL |
| **Browser** | productivity | Web research & Mining | REAL |
| **Clip** | content | Video production (DaVinci Resolve) | REAL |
| **Collector** | data | Knowledge gathering & Indexing | REAL |
| **Lead** | data | Analysis & Reporting | REAL |
| **Predictor** | data | Trend forecasting | REAL |
| **Researcher** | productivity | Documentation Analysis | REAL |
| **Twitter** | communication | Social presence (X) | REAL |

---

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
