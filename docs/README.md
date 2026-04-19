# RoboFang — Multi-Agent Coordination Hub

RoboFang is an orchestration layer for local AI agents, bridging a federated fleet of MCP servers with physical robotics and virtual environments. It prioritizes local-first sovereignty and cross-domain tool orchestration.

---

## Technical Summary

| Attribute | Specification |
|-----------|---------------|
| **Core Repository** | `D:\Dev\repos\robofang` |
| **Interface Ports** | Dashboard: 10864 / Bridge: 10871 / Supervisor: 10872 |
| **Inference Engine** | Local Ollama (Primary) / LM Studio (Fallback) |
| **Architecture** | Three-process topology (Frontend, Backend Gateway, Process Manager) |
| **Tooling Standard** | FastMCP 3.1+ (HTTP/SSE) |

---

## Documentation Index

| Module | Description |
|--------|-------------|
| [Architecture](ARCHITECTURE.md) | Technical layout and Remote Access (Tailscale) guide. |
| [Install & Setup](INSTALL.md) | Standard Windows `start.ps1` workflow. |
| [Council of Dozens](COUNCIL.md) | Multi-model coordination and adversarial evaluation protocol. |
| [Fleet Integration](FLEET_INTEGRATION.md) | External & Cloud connector management (M365, Notion). |
| [Hands System](HANDS.md) | Autonomous background processes and agent manifests. |
| [Competitive Analysis](COMPETITIVE_ANALYSIS.md) | Technical comparison and mobile parity (iPhone). |
| [Status & Health](STATUS.md) | Operational health, known issues, and connector gaps. |
| [Roadmap](ROADMAP.md) | Development phases and future capabilities. |
| [PRD](PRD.md) | Product Requirements Document (Grounded Engineering). |

---

## Quick Concepts

- **Council of Dozens**: A coordination protocol where multiple local models (Foreman, Worker, Satisficer) collaborate on a single task to reduce errors and improve reasoning fidelity.
- **Hands**: Autonomous background agents defined by `HAND.toml` manifests that run on recurring schedules (e.g., security patrolling, data collection).
- **Fleet Hub**: A central gateway that aggregates tools from 30+ MCP servers into a unified, queryable API surface.
- **Virtual-First Deployment**: A methodology where all robotics logic is validated in high-fidelity 3D simulation before physical activation.

---

## License

MIT
