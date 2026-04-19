# Hands System

Hands are autonomous background agents designed for recurring, schedule-driven operations.

---

## Technical Concept

A Hand is an independent agentic process that operates on a pulse interval. Each Hand is defined by a `HAND.toml` manifest which specifies its identity, internal prompt, and execution schedule.

### Execution Cycle

1. **Discovery**: `HandsManager` indexes all valid manifests in the `ROBOFANG_HANDS_DIR`.
2. **Scheduling**: Each Hand is assigned a recurring pulse timer based on its manifest configuration.
3. **Execution**: On each pulse, the Hand receives its current context and a tool-use interface to the Bridge.
4. **Persistence**: Hands maintain internal state across pulses via the local SQLite database.

---

## Manifest Schema (HAND.toml)

```toml
[hand]
id = "patroller"
name = "Security Patroller"
category = "monitoring"
version = "0.1.0"

[schedule]
pulse_interval = 300          # Seconds between execution turns
active_hours = "22:00-06:00"  # Operational window

[settings]
prompt_block = """
You coordinate security monitoring routines.
Tasks: Verify LiDAR anomalies and status reports from the physical patroller.
"""

[dependencies]
connectors = ["yahboom", "email"]
```

---

## Agent Catalog

| Agent | Category | Default Purpose |
|-------|----------|-----------------|
| **Assistant** | Productivity | Email triage, meeting summaries, and morning briefings. |
| **Collector** | Research | Monitoring specified data streams and indexing findings. |
| **Patroller** | Security | Anomaly detection and status verification for robotics hardware. |
| **Housemaker** | IoT | Environment optimization and energy monitoring. |
| **Avatar**| Embodiment | Coordination of VR avatar states and animation triggers. |

---

## Compatibility and Integration

### OpenFang Interoperability
RoboFang maintains structural compatibility with the OpenFang Hand format. The `openfang_adapter.py` module provides a mapping layer that translates OpenFang-standard tool names to the local MCP tool surface.

### Tool Access
Unlike single-purpose bots, Hands have unified access to the entire 30+ server MCP fleet through the Bridge gateway. An agent can, for example, read an email (comms) and then trigger a 3D renders (creative) as part of a single background pulse.
