# RoboFang: MCP Orchestration & Robotics Hub

<p align="center">
  <img src="assets/whimsical-clobber.png" width="600" alt="RoboFang Whimsical Clobber" />
</p>

<p align="center">
  <img src="assets/robofang-logo.png" width="120" alt="RoboFang Logo" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Language-Python%203.11+-blue?style=flat-square" alt="Python" />
  <img src="https://img.shields.io/badge/MCP-3.1%20Unified-orange?style=flat-square" alt="MCP 3.1" />
  <img src="https://img.shields.io/badge/Compatible-OpenClaw-9cf?style=flat-square" alt="OpenClaw" />
  <img src="https://img.shields.io/badge/Heritage-OpenFang-red?style=flat-square" alt="OpenFang" />
</p>

RoboFang is a Python-based orchestration layer designed for managing federated fleets of Model Context Protocol (MCP) servers and physical robotics hardware.

---

## LLM Connection Methods

RoboFang supports multiple backend configurations for Large Language Models:

1.  **OpenAI Cloud**: Standard API connectivity. High latency and variable operating costs.
2.  **Local Ollama**: Local inference via Ollama. 
    > [!TIP]
    > **Hardware Recommendation**: An NVIDIA GPU with at least 16GB VRAM is advisable for optimal performance with 20B+ parameter models.
3.  **Remote LM Studio (Tailscale)**: Connect to remote LM Studio instances. Designed for scenarios where the inference engine runs on a dedicated remote PC, connected via a secure Tailscale tunnel.

---

## Ecosystem Integration

### Federated Fleet Management
RoboFang acts as the central bridge for the internal MCP server and webapp fleet. It provides:
- **Unified Tooling**: Dynamic discovery and execution of tools across the fleet.
- **Observability**: Real-time logs and status monitoring for all connected nodes.
- **Port Management**: Automated culling and allocation in the `10700-10800` range.

### Multi-Agent Pipeline
The system utilizes a 3-phase reasoning loop:
- **Enrich**: Drafting technical specifications from initial prompts.
- **Execute**: Tool-based execution via ReAct patterns.
- **Audit**: Verification of output against original specifications.

### Robotics & Virtual Sync
- **Hardware**: Native control for Unitree G1 and Go2 robotics.
- **Virtual**: Real-time motion synchronization for VROID models and VRChat/Unity3D environments via OSC.

---

## Quick Start

RoboFang manages dependencies using `uv`.

```powershell
# 1. Environment Setup
git clone https://github.com/sandraschi/robofang.git
cd robofang
uv venv; .venv\Scripts\activate

# 2. Launch Services
.\start_all.ps1
```

**Dashboard:** `http://localhost:10864`

**First-run / Comms:** Open the dashboard → **Onboarding** to set Telegram and Discord credentials for command replies and notifications. See [docs/ONBOARDING_AND_COMMS_CREDENTIALS.md](docs/ONBOARDING_AND_COMMS_CREDENTIALS.md) and [docs/COMMAND_VIA_EMAIL_TELEGRAM.md](docs/COMMAND_VIA_EMAIL_TELEGRAM.md).

---

## Documentation

- **[ONBOARDING_AND_COMMS_CREDENTIALS.md](docs/ONBOARDING_AND_COMMS_CREDENTIALS.md)**: Onboarding page and where comms credentials live.
- **[COMMAND_VIA_EMAIL_TELEGRAM.md](docs/COMMAND_VIA_EMAIL_TELEGRAM.md)**: Sending commands via Telegram or email and the `/hooks/command` webhook.
- **[TECHNICAL_DESCRIPTION.md](docs/TECHNICAL_DESCRIPTION.md)**: Architectural details and protocol specifications.
- **[docs/AGENTIC_OS_PHILOSOPHY.md](docs/AGENTIC_OS_PHILOSOPHY.md)**: Core design principles for sovereign agents.
- **[docs/SAFETY.md](docs/SAFETY.md)**: Logic regarding the Dark Twin Universe (DTU) and resource limits.

---

## Relationship to OpenFang

> [!NOTE]
> RoboFang is a specialized fork/evolution of the [RightNow-AI/OpenFang](https://github.com/RightNow-AI/openfang) project. While the source project provides a high-performance Rust-based "Agent OS" for general use, RoboFang is tailored specifically for **Vertical Robotics Integration**, **Multi-agent Council logic**, and **Local-first Sovereign stacks**.

---

## License
Distributed under the MIT License.
