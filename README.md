# RoboFang — Multi-Agent Coordination Hub

RoboFang is an orchestration layer for local AI agents, designed to bridge a federated fleet of MCP servers with physical robotics and virtual environments.

---

## Documentation

Standard technical documentation is organized by category:

| Domain | Description |
|:-------|:------------|
| [Assessment](ASSESSMENT.md) | Technical audit of the current state and roadmap. |
| [Architecture](docs/ARCHITECTURE.md) | Multi-process topology and module layout. |
| [Setup](docs/INSTALLATION.md) | Local deployment guide (UV, Ollama, Dashboard). |
| [Council Protocol](docs/COUNCIL.md) | Multi-model coordination and adjudication logic. |
| [Fleet Management](docs/FLEET.md) | Port registry and connector integration for the 30+ server fleet. |
| [Autonomous Hands](docs/HANDS.md) | Manifest-driven background processes. |
| [Comparison Matrix](docs/COMPETITION.md) | Technical mapping against OpenClaw and OpenFang. |
| [Roadmap](docs/ROADMAP.md) | Strategic development phases and priorities. |
| [Status](docs/STATUS.md) | Operational health and tech debt registry. |
| [Security integrations](docs/SECURITY_INTEGRATIONS.md) | DefenseClaw, OpenShell, Bastio — roadmap and honesty contract (what is not wired). |

---

## Technical Overview

### Deployment Stack
- **Backend**: FastAPI + FastMCP 3.1+ (Python 3.12).
- **Frontend**: React + Vite (Port 10864).
- **Adjudication**: Council of Dozens (Foreman/Worker/Satisficer logic).
- **Inference**: Local Ollama (Primary).

### Core Features
- **Local-First**: Zero-token cost operations via optimized local models.
- **Unified Tool Surface**: Standardized API gateway for heterogeneous MCP backends.
- **Embodiment**: Joint control for robotics (Bumi, Yahboom) and VR systems (Resonite, VRChat).
- **Security Gates**: Policy-driven adversarial adjudication for sensitive operations.

---

## Quick Setup

1. **Environment**: `uv sync`
2. **Backend**: `uv run python -m robofang.cli start bridge`
3. **Frontend**: `cd dashboard; .\start.ps1`

Visit http://localhost:10864 to manage the coordination node.
