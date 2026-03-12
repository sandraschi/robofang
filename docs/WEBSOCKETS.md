# WebSockets & Real-time Streams

Documentation for the real-time communication channels in RoboFang.

## Hub Events (Port 10871)

The Bridge provides a structured WebSocket stream for UI synchronization and agent deliberations.

- **Endpoint**: `ws://localhost:10871/ws/events`
- **Topics**:
  - `fleet_update`: Changes in connector status.
  - `deliberation_step`: Real-time reasoning logs.
  - `system_status`: CPU/Memory/Network metrics.

## Robotics Telemetry (Port 10835)

High-frequency sensor data from Home Assistant and Direct Robotics connectors.

- **Protocol**: MQTT or WebSocket.
- **Frequency**: 10Hz - 100Hz depending on channel.

## Virtual Environment Sync (OSC Bridge)

OSC messages are bridged to WebSockets for internal UI feedback.

- **Endpoint**: `ws://localhost:10871/ws/osc`
- **Address Patterns**: `/robofang/virtual/*`
