# 🪝 RoboFang v1.8.0 (Beta)

**The Command Center for AI Agent Fleets and Real-World Robotics.**

---

[![Status: Beta](https://img.shields.io/badge/Status-Beta-yellow.svg)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![UV](https://img.shields.io/badge/Package_Manager-UV-orange.svg)](https://github.com/astral-sh/uv)
[![Tailscale](https://img.shields.io/badge/Network-Tailscale-blue.svg)](https://tailscale.com)

> [!WARNING]
> RoboFang is currently in **Beta Status**. Version v1.8.0 introduces significant architectural changes for physical integration and security. Expect rapid iteration as we move towards a stable release.

RoboFang is a secure hub that connects your AI agents (MCP servers) to the physical world. It provides a local-first environment where agents can safely control smart home devices, manage professional software tools, and operate robotic hardware. It prioritizes privacy, local execution, and safety.

## 📖 Comprehensive Documentation

### 🛠️ Getting Started
- **[Installation Guide](docs/INSTALLATION.md)**: System requirements and setup instructions.
- **[Quick Start](docs/COUNCIL_QUICK_START.md)**: Your first mission with the RoboFang Council.
- **[CLI Toolbelt](docs/CLI_TOOLBELT.md)**: Managing the fleet from the command line.
- **[Onboarding](docs/ONBOARDING_AND_COMMS_CREDENTIALS.md)**: Setting up communication channels and credentials.

### 🏗️ System Architecture
- **[Agentic Mesh](docs/architecture/AGENTIC_MESH_ARCHITECTURE.md)**: High-level overview of the federated node architecture.
- **[Cognitive Loop](docs/COGNITIVE_ARCHITECTURE.md)**: Deep dive into the foreman/labor/audit reasoning engine.
- **[OpenClaw++ Standards](docs/standards/AGENT_PROTOCOLS.md)**: The underlying protocols for autonomous coordination.
- **[Philosophy](docs/AGENTIC_OS_PHILOSOPHY.md)**: Why we build for sovereign agency.

### 🕸️ The Mesh (Software & Tools)
- **[MCP Fleet](docs/MCP_FLEET.md)**: Discovering and managing model context protocol servers.
- **[Skill Manager](docs/HANDS.md)**: Developing and deploying custom "hands" for specific tasks.
- **[Federation](docs/FEDERATION.md)**: Bridging multiple RoboFang nodes across Tailscale.
- **[MemOps](docs/MEMOPS_STATUS.md)**: Long-term memory and knowledge graph integration.

### 🛡️ Security & Safety
- **[Safety Logic](docs/SAFETY.md)**: How the Mission Loop prevents non-deterministic failures.
- **[Dark Twin (DTU)](docs/SANDBOX_SPEC.md)**: Using filesystem shadows for safe staging.
- **[Security Integrations](docs/SECURITY_INTEGRATIONS.md)**: Bastio (Anti-Injection) and DefenseClaw (Sandboxing).
- **[Autonomous Emergency Dispatch (AED)](docs/SAFETY.md#aed)**: Level 4 industrial rescue response with Trinity verification.

### 🤖 Physical Agency (Robotics)
- **[Robotics Overview](docs/ROBOTICS.md)**: Standardizing actuator mapping and motion control.
- **[Robot Safety & Hazards](docs/ROBOT_SAFETY.md)**: Crucial protocols for protecting your physical space.
- **[Noetix Bumi Android](docs/EMBODIED_SENTIENCE.md)**: Guide to operating the flagship 1m humanoid substrate.
- **[Yahboom Baseline](docs/ROBOTICS.md#yahboom)**: Entry-level support for Raspbot and mapping platforms.
- **[Snark T-800](docs/ROBOTICS_T_800.md)**: Decommissioned status and critical safety warnings.

---

## 🚀 Quick Start
```powershell
# 1. Clone & Sync
git clone https://github.com/sandraschi/robofang
cd robofang
uv sync

# 2. Secure Launch
uv run python -m robofang.main
```

---
*Engineering for sovereign agency. Every line of code is a step towards physical presence.*
