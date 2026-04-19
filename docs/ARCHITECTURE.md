# RoboFang Architecture

RoboFang is implemented as a multi-process coordination layer designed for local-first tool orchestration.

---

## System Topology

The platform consists of three primary processes communicating via standard HTTP/SSE:

| Process | Port | Function |
|---------|------|----------|
| **Dashboard** | 10864 | React/Vite frontend environment for monitoring and fleet configuration. |
| **Bridge** | 10871 | Core FastAPI gateway. Manages connector lifecycles and provides the tool-use API surface. |
| **Supervisor** | 10872 | Process manager. Handles initialization, health monitoring, and recovery of the Bridge. |

### Component Interaction

- **Dashboard** utilizes the Bridge API for task submission and real-time event streaming.
- **Bridge** acts as a reverse proxy for the underlying MCP fleet, normalizing diverse tool schemas.
- **Supervisor** ensures the backend environment remains operational during long-running tasks.

---

## Module Inventory

Core logic is organized within `src/robofang/core/`:

### Coordination & Reasoning

| Module | Purpose |
|--------|---------|
| **Orchestrator** | Central logic for task routing, connector management, and hand scheduling. |
| **Reasoning Engine** | Hardened ReAct loop (v12.1) with robust parsing and circular logic detection. |
| **Heartbeat** | [Sovereign Integrity Audit](heartbeat.py) (v12.1); async periodic fleet verification. |
| **Plugin Manager** | Handles dynamic loading of connectors from the federation manifest. |

### Autonomous Processes (Hands)

| Module | Purpose |
|--------|---------|
| **Hands Manager** | Manages the lifecycle and pulse schedule of background agents. |
| **Base Hand** | Inheritable class for defining autonomous logic and state management. |

### Information & Security

| Module | Purpose |
|--------|---------|
| **Knowledge Engine** | RAG-based context retrieval for localized information sourcing. |
| **Security Manager** | Enforces role-based access control and policy-driven tool gates. |
| **Financial Bastion** | [Total Cloud Supervision](FINANCIAL_BASTION.md) and budget enforcement. |
| **VRAM Orchestrator** | [GPU Resource Management](MODEL_ECONOMY.md) for tiered local inference. |
| **Bastio/Bastion** | Logic and resource gates for sandboxing execution environments. |

---

## Data Management

### Persistent Storage
- **Relational Data**: SQLite maintains session states, routine configurations, and audit timestamps.
- **Vector Search**: LanceDB provides fast semantic retrieval for project-specific knowledge.
- **Configuration**: JSON-based manifests define the fleet topology and council model tiers.

### Communication Flow
- **Internal**: Standard Python `asyncio` for non-blocking concurrent operations.
- **Inference**: HTTP-based JSON requests to local Ollama or remote cloud fallbacks.
- **Fleet**: Standard MCP (Model Context Protocol) over HTTP/SSE.
- **Multimodal Live**: Low-latency RPC (Gemini 3.1 Flash Live API) for real-time HRI.

---

## Multimodal Live Layer

For high-fidelity Human-Robot Interaction (HRI), RoboFang implements a **Live Multimodal Bridge**.

- **Provider**: Gemini 3.1 Flash Live (via Google AI Studio Live API).
- **Function**: Sub-100ms bi-directional audio/video streaming with full interruption support.
- **Hardware Integration**:
  - **Unitree G1**: Real-time vision from head cameras and spatial audio.
  - **Resonite**: Direct integration with virtual headsets for socially-aware AI interaction.
- **Safeguards**: All Live traffic is routed through the **[Financial Bastion](FINANCIAL_BASTION.md)** to prevent runaway costs, with a mandatory local fallback to **Kyutai/Moshi** if budgets are exceeded.

## Remote Access & Mobile Parity

To ensure operational parity with messaging-first frameworks (e.g., OpenClaw), RoboFang utilizes **Tailscale** for secure, zero-config remote access.

- **Sovereign Dashboard**: Accessible via `http://<tailscale-ip>:10864` on any mobile device. The UI is designed for responsive monitoring and intervention.
- **Unified API**: The Bridge gateway (`10871`) can be accessed by remote agents or mobile shortcuts for quick status polling.
- **Security**: All remote traffic is encrypted end-to-end within the private Tailnet, bypassing the need for public port forwarding.
