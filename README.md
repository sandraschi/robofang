# 🪝 RoboFang v1.8.0-alpha

**A Comprehensive Orchestration Substrate for Agentic Fleets and Physical Agency.**

---

[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-red.svg)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![UV](https://img.shields.io/badge/Package_Manager-UV-orange.svg)](https://github.com/astral-sh/uv)
[![Tailscale](https://img.shields.io/badge/Network-Tailscale-blue.svg)](https://tailscale.com)

> [!WARNING]
> RoboFang is currently in **Alpha Status**. Version v1.8.0 introduces significant architectural changes for physical integration and security. Expect rapid iteration and breaking changes.

RoboFang is a high-fidelity orchestration node designed to bridge local LLM intelligence with a federated fleet of MCP servers and robotic hardware. Built for sovereign control, it prioritizes local execution, cryptographic safety, and physical integration. v1.8.0 introduces the **OpenClaw++** mission loop to ensure deterministic tool use and auditing.

## 🌟 The Breakthrough: Noetix Bumi Android
v1.8.0 establishes the **Noetix Bumi Android** (1m biped) as the primary centerpiece for **Physical Agency**.
- **iPhone-Priced Breakthrough**: At approximately $1,399, the Bumi delivers the first true mass-market humanoid substrate for agentic experimentation.
- **Hardware Integration**: High-fidelity control of Bumi's 21+ Degrees of Freedom and sensory array.
- **Yahboom Baseline**: Full support for the Raspbot v2 platform for entry-level robotics and mapping.
- **Actuator Mapping**: Modular controllers that standardize how agents interact with hardware manipulators.

## 🛡️ Secure Reasoning: The Mission Loop
RoboFang introduces a robust reasoning pipeline designed to prevent non-deterministic errors:
1.  **Enrich (The Foreman)**: Generates high-resolution mission specifications with HMAC-SHA256 signing.
2.  **Execute (The Labor)**: ReAct-based tool utilization within the **Dark Twin Universe (DTU)** shadow proxy.
3.  **Audit (The Satisficer)**: Verifies mission outcomes against the signed specification before atomic commit.

### Security Features
- **Dark Twin Universe (DTU)**: A filesystem shadow proxy for staging and auditing changes before they impact the host.
- **Secure Bindings**: Dynamic Tailscale IP discovery prevents exposure to non-trusted local networks.
- **Resource Guard**: Active monitoring and circuit-breaking for child processes.

## 🚀 Quick Start
```powershell
# 1. Clone & Sync
git clone https://github.com/sandraschi/robofang
cd robofang
uv sync

# 2. Secure Launch
uv run python -m robofang.main
```

## 📖 Documentation
- [**Installation Guide**](docs/INSTALLATION.md) — UV, Tailscale, and hardware setup.
- [**Architecture**](docs/ARCHITECTURE.md) — The mission loop and service topology.
- [**Advanced Features**](docs/ADVANCED_FEATURES.md) — DTU, Hmac-Signing, and agent hierarchies.
- [**Robotics & Physical Agency**](docs/ROBOTICS.md) — Factual deep-dive into the Bumi breakthrough.
- [**Competitive Analysis**](docs/COMPETITION.md) — RoboFang vs. other orchestration frameworks.

---
*Engineering for sovereign agency. Every line of code is a step towards physical presence.*
