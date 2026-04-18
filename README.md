# 🪝 RoboFang v1.8.0 (OpenClaw++)

**The Sovereign Industrial Orchestrator for Agentic Fleets & Physical Agency.**

---

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![UV](https://img.shields.io/badge/Package_Manager-UV-orange.svg)](https://github.com/astral-sh/uv)
[![Tailscale](https://img.shields.io/badge/Network-Tailscale-blue.svg)](https://tailscale.com)

RoboFang is a high-fidelity orchestration substrate designed to bridge local LLM intelligence with a federated fleet of MCP servers and physical robotics. Built for the **Sandra-class Sovereign Hub**, it prioritizes local execution, cryptographic safety, and embodied sentience.

## 🌟 The Centerpiece: Noetix Bumi Android
v1.8.0 establishes the **Noetix Bumi Android** (1m biped) as the primary fleet centerpiece. 
- **Embodied Control**: Direct integration with Bumi's joint actuators and sensory array.
- **Yahboom Baseline**: Full support for the Yahboom baseline robotics platform for rapid prototyping.
- **Dynamic Hand Mapping**: Modular `Hand` implementations for cross-platform physical agency.

## 🛡️ Industrial Safety: The Bastio Moat
RoboFang introduces the **OpenClaw++ Safety Standard**, replacing legacy non-deterministic execution with an industrial-grade mission loop:
1.  **Enrich (Foreman)**: High-resolution specification generation with HMAC-SHA256 signing.
2.  **Execute (Labor)**: ReAct-based tool utilization within a controlled execution window.
3.  **Audit (Satisficer)**: Cryptographic verification of mission outcome against the original spec.

### Key Security Features
- **Dark Twin Universe (DTU)**: A filesystem shadow proxy for staging and auditing changes before atomic commit.
- **Secure Bindings**: Dynamic Tailscale IP discovery (`100.118.171.110`) prevents exposure to non-trusted local networks.
- **Bastion Quotas**: Process-level resource monitoring and circuit breaking.

## 🚀 Quick Start
```powershell
# 1. Clone & Sync
git clone https://github.com/sandraschi/robofang
cd robofang
uv sync

# 2. Secure Launch
# RoboFang automatically binds to your Tailscale IP for secure remote access.
uv run python -m robofang.main
```

## 📖 Technical Documentation
- [**Installation Guide**](docs/INSTALLATION.md) — UV, Tailscale, and hardware setup.
- [**Architecture Deep-Dive**](docs/ARCHITECTURE.md) — The 3-phase mission loop and service topology.
- [**Advanced Features**](docs/ADVANCED_FEATURES.md) — DTU, Hmac-Signing, and Prometheus metrics.
- [**Competitive Analysis**](docs/COMPETITION.md) — Why RoboFang leads the "OpenClaw++" era.

## 🤝 The Federated Fleet
RoboFang orchestrates 100+ specialized MCP servers, including:
- 📚 **Calibre-MCP**: Personal library management.
- 🎬 **Plex-MCP**: Media ecosystem enrichment.
- 🛠️ **Docker-MCP**: Isolated infrastructure control.
- 🎨 **Blender-MCP**: 3D spatial reasoning and rendering.

---
*Materialist engineering for sovereign agents. Every line of code is a step toward physical agency.*
