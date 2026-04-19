# Fleet Integration

RoboFang orchestrates a fleet of specialized MCP servers through a decentralized connector architecture.

---

## Adapter Mechanism

Services are integrated into the fleet via two primary methods:

1. **Integrated Connectors**: Protocol-specific adapters in `core/connectors.py` (SMTP, WebSocket, REST) for direct service communication.
2. **MCP Bridge**: A generic adapter for FastMCP HTTP servers, providing a standardized tool surface for the orchestrator.

### Port Allocation Registry

All fleet members utilize a reserved port range (10700–10875) to prevent local conflicts.

| Component | Port | Description |
|-----------|------|-------------|
| **RoboFang Dashboard** | 10864 | Task monitoring and fleet status frontend. |
| **RoboFang Bridge** | 10871 | Backend API and tool orchestration gateway. |
| **Fleet Servers** | 10700-10860 | Specialized MCP backends (Virtualization, Memory, Media, etc.) |

---

## Operational Domains

To facilitate efficient tool discovery, services are categorized into semantic domains:

- **System**: Infrastructure, process management, and OS operations.
- **Knowledge**: Media libraries, note-taking systems, and long-term memory.
- **Hardware/IoT**: Smart home devices, sensors, and camera systems.
- **Embodiment**: Robotics joint control and virtual environment automation.
- **Creative**: 3D modeling, video production, and audio engineering.

---

## Federation Manifest (`federation_map.json`)

The fleet topology is defined in a central manifest, which specifies:
- **Enabled Status**: Toggle for specific connectors.
- **Capability Schema**: Definitions of tools provided by each connector.
- **Model Tiers**: Allocation of local models to specific council roles.
- **Satellite Nodes**: Host and port configurations for remote fleet members.

---

## External & Cloud Integration

While RoboFang prioritizes local-first sovereignty, it is designed to integrate third-party and cloud-managed MCP servers where local rebuilding is impractical.

- **Cloud Connectors**: Specifically for Microsoft 365, Google Workspace, and Notion.
- **Frontier Bridges**: Low-latency multimodal APIs (Gemini 3.1 Flash Live) used for high-fidelity interaction.
- **Policy**: External servers are bridged via the `MCPBridgeConnector`, provided they expose a compliant FastMCP HTTP interface.
- **Security**: Cloud-based tools are subject to the same **[Taboo Protocol](TABOO_PROTOCOL.md)** and **[Financial Bastion](FINANCIAL_BASTION.md)** gates as local destructive tools.

---

## Bastion Supervision & Hooks

Every integrated fleet member, whether local or cloud-based, must expose hooks for **Bastion Supervision**.

1. **Resource Hook**: Local MCP servers must report CPU/RAM usage to the [Local Bastion](ARCHITECTURE.md#information--security).
2. **Financial Hook**: Cloud-based providers must provide token/cost estimation schemas for the [Financial Bastion](FINANCIAL_BASTION.md).
3. **Safety Hook**: All destructive tools must be explicitly tagged in the manifest, triggering a mandatory [Taboo Protocol](TABOO_PROTOCOL.md) check and [Sandbox](SANDBOX_SPEC.md) requirement.

---

## Integration Guidelines

### Service Discovery
The Bridge performs automatic service discovery on startup by verifying the endpoints defined in the federation manifest. Failed connections are logged, and the corresponding tools are disabled for the session.

### Schema Normalization
RoboFang normalizes diverse service outputs into a consistent format for the Reasoning Engine. This reduces the formatting load on smaller local models and improves overall reliability.

---

## Adding a New Connector

1.  **Develop Server**: Create your MCP server using FastMCP.
2.  **Define Manifest**: Add the service entry to `federation_map.json`.
3.  **Validate Endpoint**: Ensure the server exposes a valid `/tools` endpoint.
4.  **Restart Bridge**: The system will auto-discover the new connector on initialization.

For detailed guidelines, see `docs/CONTRIBUTING_MCP_AND_HANDS.md` in the main repository.
