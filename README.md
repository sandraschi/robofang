# 🪝 RoboFang v1.8.0-alpha

**The Command Center for AI Agent Fleets and Real-World Robotics.**

> [!IMPORTANT]
> **Canonical Documentation**
> The core design, integration specs, and standard operating procedures for RoboFang have been migrated to the `mcp-central-docs` repository. 
> Please see `mcp-central-docs/projects/robofang` for the canonical knowledge base.

---

[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-red.svg)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![UV](https://img.shields.io/badge/Package_Manager-UV-orange.svg)](https://github.com/astral-sh/uv)
[![Tailscale](https://img.shields.io/badge/Network-Tailscale-blue.svg)](https://tailscale.com)

> [!WARNING]
> RoboFang is currently in **Alpha Status**. Version v1.8.0 introduces significant architectural changes for physical integration and security. Expect rapid iteration and breaking changes.

RoboFang is a secure hub that connects your AI agents (MCP servers) to the physical world. It provides a local-first environment where agents can safely control smart home devices, manage professional software tools, and operate robotic hardware like the **Noetix Bumi**. It prioritizes privacy, local execution, and safety.

## 🌟 Our favorite bot: Noetix Bumi Android
v1.8.0 establishes the **Noetix Bumi Android** (1m biped) as a primary centerpiece for robotics experimentation.
- **Accessible Robotics**: At approximately $1,399, the Bumi delivers the first true mass-market humanoid substrate for agentic experimentation.
- **Hardware Integration**: High-fidelity control of Bumi's 21+ Degrees of Freedom and sensory array.
- **Yahboom Baseline**: Full support for the Raspbot v2 platform for entry-level robotics and mapping.
- **Actuator Mapping**: Modular controllers that standardize how agents interact with hardware manipulators.

## 🛡️ Safe Automation: The Mission Loop
To ensure your agents operate reliably and don't make mistakes, RoboFang uses a "Mission Loop" security pipeline. This three-step process ensures that every action is planned, tested, and checked:

1.  **Define the Plan (The Foreman)**: First, the system analyzes your request and generates a detailed "blueprint" of exactly what should happen. This includes clear success criteria and safety boundaries so the agent knows exactly what the finished goal looks like.
2.  **Execute in a Sandbox (The Labor)**: Instead of working directly on your system, the agent carries out its tasks inside a "Dark Twin" environment—a safe, isolated shadow of your files. This prevents any accidental damage or partial errors from affecting your real data.
3.  **Audit the Results (The Satisficer)**: Finally, a secondary judge reviews the completed work. It compares the actual results against the original blueprint. If everything meets the quality standards, the changes are committed. If anything is wrong, the changes are discarded, keeping your system in a known safe state.

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
> [!NOTE]
> Detailed documentation is natively managed in the `mcp-central-docs` Fleet standard.
> See `mcp-central-docs/projects/robofang/` for detailed architectural plans, guides, and integration information.

---
*Engineering for sovereign agency. Every line of code is a step towards physical presence.*
