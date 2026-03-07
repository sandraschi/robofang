# 🐺 OpenFang Sovereign Orchestration Hub

> [!IMPORTANT]
> **Sovereign Status**: OpenFang is the primary orchestration node for the Sandra-class federated fleet.

OpenFang is a high-performance orchestration layer designed to coordinate a distributed fleet of **Model Context Protocol (MCP)** servers. It features an autonomous "Council of Dozens" for complex synthesis and a premium "Sovereign Dashboard" for fleet-wide observability.

### 🌑 v2.0 "Dark Integration" Flow
OpenFang v2.0 introduces a 3-phase high-fidelity reasoning cycle:
1.  **Enrich (The Foreman)**: High-intelligence specification generation from raw vibes/prompts.
2.  **Execute (The Labor)**: Agentic ReAct loop for tool utilization and execution.
3.  **Audit (The Satisficer)**: Post-execution verification against the initial specification.

## 🚀 Key Features

- **Neural Media RAG Portmanteau**: High-speed LanceDB semantic retrieval via the `openfang_rag` unified tool, featuring Delta-Sync caching for massive media sets.
- **Council of Dozens**: Multi-agent adversarial synthesis with specialized roles (**Foreman**, **Satisficer**, **Adjudicator**).
- **Dark Reasoning Bridge**: Real-time forensic observation via `/deliberations` event stream.
- **Sovereign Dashboard**: A premium SOTA interface (Port 10864): LLM (Ollama model list/load), Chat, Help, Status, Council, Fleet, Deliberations.
- **MCP 3.1 Unified Gateway**: Bridge and MCP in one process (default port 10871). Connect Cursor/Claude to `http://localhost:10871/sse`. Tools: status, help, ask, fleet, deliberations, agentic workflow (sampling).
- **Local LLM**: Ollama proxy at `/api/llm/models`, `/api/llm/load`, `/api/llm/generate`; dashboard uses Bridge as single origin.
- **Skill Bridge**: Direct integration with the `memops` skill facility repository.
- **Hardware Sync**: Virtual-to-Physical motion synchronization for VROID Studio and Unitree robotics.
- **Sandbox Orchestration**: Automated deployment and tasking within isolated Windows Sandbox environments.
- **Security & Safety**: Multi-phase protection via [DTU (Dark Twin Universe)](docs/SAFETY.md) and [Bastion resource monitoring](docs/SAFETY.md).

## 🛠️ Installation

OpenFang requires `uv` for high-speed dependency management and Python 3.10+.

```powershell
git clone https://github.com/sandraschi/openfang.git
cd openfang
uv venv
source .venv/Scripts/activate
uv pip install -e .
```

## 🌐 Sovereign Dashboard

OpenFang includes a dedicated web interface for fleet management.

- **Port**: `10864` (dashboard), `10871` (Bridge + MCP)
- **Location**: `/dashboard` (React/Vite app)
- **Pages**: LLM (Ollama models, load, inference test), Chat (hub chat + Council toggle), Help (guides + MCP help from Bridge), Status (bridge health, supervisor, connectors), Council, Fleet, Deliberations, Logger, etc.
- **Visuals**: Premium Dark Mode, Glassmorphism, real-time synthesis feed.

### Startup
```powershell
# Bridge (and MCP) — default port 10871
uv run python -m openfang.main
# or: openfang-bridge

# Dashboard — port 10864
cd dashboard
.\start.bat
```

## 📂 Repository Structure

- `/dashboard`: React/Vite frontend (Sovereign Interface).
- `/tools`: Core orchestration logic (`council_orchestrator.py`, `skill_bridge.py`).
- `/configs`: Federation maps and adjudicator templates.
- `/containers`: Sandbox provisioners and `.wsb` templates.
- `/docs`: Detailed protocol and architectural documentation.
  - **[OPENFANG_MCP_AND_ROADMAP.md](docs/OPENFANG_MCP_AND_ROADMAP.md)** — Architecture, MCP 3.1 unified gateway, and roadmap.
  - **[docs/skills/openfang-operator.md](docs/skills/openfang-operator.md)** — Operator skill: when to use which tool, Council workflow.
- `/tests`: Validation suite.

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
