# Protocol Standards

Documentation of the communication protocols used within the RoboFang ecosystem.

## MCP (Model Context Protocol)
The primary standard for connecting AI systems to external tools.

- **Transport**: SSE (Server-Sent Events) over HTTP.
- **Payload**: JSON-RPC 2.0.
- **Bridge Port**: 10871 (SSE endpoint: `/sse`).

## A2A (Agent-to-Agent)
RoboFang's custom protocol for secure, attested communication between sovereign agents.

- **Attestations**: signed JWT or similar cryptographic proofs.
- **Discovery**: via the Bridge Fleet Registry.

## OSC (Open Sound Control)
Used for real-time interaction with virtual environments and A/V hardware.

- **Ports**: 10700-10800 range assigned to specific applications.
- **Mapping**: see `osc_map.json` for address patterns.

## WebSockets
Real-time state synchronization for Hubs and high-frequency sensor data.
