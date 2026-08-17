# SPEC: Physical Space Map

**Status**: Draft  
**Author**: Sandra Schipal  
**Date**: 2026-07-30  
**Target**: robofang v1.9.0

## Goal

Build and maintain a live 2D spatial model of Sandra's apartment, mapping robot positions, smart device locations, and zones — queryable by agents and the hub dashboard.

## Why

The Council currently operates with zero spatial awareness. An agent can't answer "which robot is closest to the Ring doorbell that just detected motion" or "is the vacuum robot in the same room as the fragile sculpture." A space map gives agents a *where* dimension for perception and action. It also feeds into safety logic (don't move a robot arm if a human is detected in its radius).

## Requirements

### 1. Core Data Model

```yaml
spaces:
  - id: office
    name: Office
    bounds: { x: 0, y: 0, w: 500, h: 400 }  # cm, local coordinate system
    adjacent_to: [living-room, hallway]

entities:
  - id: ring-doorbell
    type: device
    space: hallway
    position: { x: 450, y: 50 }
    config:
      source: ring-mcp
      connector: RingConnector

  - id: yahboom-raspbot
    type: robot
    space: office
    position: { x: 300, y: 200 }
    heading: 90  # degrees
    last_seen: "2026-07-30T14:30:00Z"
    config:
      source: yahboom-mcp
      control_port: 10892

  - id: hue-ceiling-1
    type: light
    space: office
    position: { x: 250, y: 0 }  # ceiling
    config:
      source: phue
      light_id: 3
```

### 2. Data Sources

- **Static layout**: `configs/space_map.yaml` — rooms, walls, fixed device positions
- **Robot positions**: Poll yahboom-mcp `/api/v1/position` and unitree-mcp `/api/v1/localization` every 5s
- **Device discovery**: Query fleet registry for devices with `space:` tags
- **Human detection**: Camera/ring motion events → update position estimate

### 3. MCP Resources

- `resource://space/map` — full spatial model as JSON
- `resource://space/room/{room_id}` — single room entities
- `resource://space/device/{device_id}` — single device with latest position

### 4. MCP Tools

- `robofang_space_get(map_format="json" | "svg")` — full map
- `robofang_space_query(operation, ...)` — query operations:

  | Operation | What | Example |
  |-----------|------|---------|
  | `entities_in_radius` | Find entities near a point | `x=250, y=150, radius=100` |
  | `entities_in_room` | List entities in a room | `room="office"` |
  | `nearest_to` | Nearest entity by type to a point | `target="ring-doorbell", entity_type="robot"` |
  | `path_between` | Shortest path (room adjacency graph) | `from="office", to="kitchen"` |

### 5. Hub Dashboard Panel

- 2D SVG/Canvas render of the apartment floor plan
- Entity icons positioned live on the map: green for online, red for offline
- Click an entity → show status card + quick actions
- Robot trails (last N positions as a fading polyline)

### 6. Safety Integration

- Council agents check `robofang_space_query(operation="entities_in_radius", ...)` before executing physical actions
- If a human is detected within the safety radius of a robot operation, the action is gated with `confirm=True`
- The safety radius is configurable per robot: `configs/safety_zones.yaml`

## Non-Goals

- 3D volumetric map (2D floor plan + height tags for ceiling vs floor entities is sufficient)
- Live SLAM ingestion (robot-provided pose data only; no LIDAR/camera fusion)
- Multi-level buildings (single-floor apartment for v1)

## Implementation Sketch

```
src/robofang/space/
├── __init__.py
├── model.py           # Pydantic models: Space, Entity, Position
├── map_store.py       # Load/save configs/space_map.yaml, maintain in-memory state
├── position_poller.py # Background thread: poll robot positions every 5s
├── query_engine.py    # Spatial queries (radius, room, nearest, path)
├── resources.py       # MCP resource handlers
├── tools.py           # MCP tool handlers
└── hub_api.py         # REST endpoints for hub dashboard
```

## Open Questions

- Should the space map use real-world coordinates (cm from a origin) or a room-relative grid? Real-world coordinates compose better but require calibration per-apartment.
- How often do we poll robot positions? Every 5s is fine for a vacuum but too slow for a robot arm — maybe per-robot interval config.
