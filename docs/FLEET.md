# Fleet Integration & Port Map

RoboFang manages 30+ MCP servers through specialized connectors.

---

## Port Registry

All RoboFang services and fleet members use the **10700–10875** port range. Never use standard ports (3000, 5000, 8000) for new connectors.

### Core Services
- **Dashboard**: `10864`
- **Bridge**: `10871`
- **Supervisor**: `10872`
- **Adapter (MCP)**: `10865`

### Key Fleet Members
- **Virtualization**: `10700 / 10701`
- **Advanced Memory**: `10705`
- **Calibre Library**: `10720 / 10721`
- **Plex Media**: `10740 / 10741`
- **Home Assistant**: `10835`
- **OSC Bridge**: `10766`

---

## Federation Map

The fleet topology is defined in `configs/federation_map.json`. This file controls:
- Which connectors are enabled.
- Which ports the Bridge should scan.
- Which models are available as Council members.
- Domain groupings for tools.

---

## Adding Connectors

To integrate a new MCP server:
1. Register it in `configs/federation_map.json`.
2. Ensure it implements the FastMCP 3.1 HTTP transport.
3. Restart the RoboFang Bridge.
