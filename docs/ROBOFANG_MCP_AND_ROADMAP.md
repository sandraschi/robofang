# RoboFang Architecture, MCP Integration & Roadmap

Thorough overview of the RoboFang MCP & robotics hub, the role of **robofang-mcp**, and concrete suggestions to expand and improve the system.

---

## Implementation status (MCP 3.1 Unified Gateway)

**Done.** The Bridge runs a FastMCP 3.1 server in the same process (unified gateway). MCP over SSE: connect to `http://localhost:PORT/sse` (default PORT 10871). The **Autonomous Hands (Substrate)** system is fully operational, managing background agents (Mar 2026).

---

## 1. Current architecture summary

### 1.1 Components

| Component | Role | Location / entry |
|-----------|------|-------------------|
| **RoboFang Bridge** | FastAPI app; HTTP API and reverse proxy for the fleet. | `src/robofang/main.py`, script `robofang-bridge`. |
| **OrchestrationClient** | Central coordinator: connectors, reasoning, council, RAG, skills, security, personality, knowledge, Moltbook. | `src/robofang/core/orchestrator.py`. |
| **MCP backends** | External MCP servers (Plex, Calibre, HA, Blender, virtualization, advanced-memory, etc.) reachable at fixed ports. | Port map in `main.py` (`MCP_BACKENDS`); not part of this repo. |
| **Connectors** | Plugins that talk to external services (Moltbook, Discord, Plex, Tapo, etc.). Enabled via `ROBOFANG_CONNECTORS` or `federation_map.json`. | `core/plugins`, `_init_connectors()`. |
| **Council** | Multi-agent Enrich → Execute → Audit (Foreman, Labor, Satisficer); adjudicators from `configs/council_debate_prompt.md`. | `tools/council_orchestrator.py`, invoked from `orchestrator.ask(..., use_council=True)`. |
| **ReasoningEngine** | Ollama-based ReAct loop; tool bridge built from skills + connectors. | `core/reasoning.py`, `core/orchestrator.py` (`_build_tool_bridge`). |
| **Safety** | DTU (Dark Twin Universe) sandbox proxy, Bastion (CPU/RAM quotas), Bastio (policy gate). | `docs/SAFETY.md`, sandbox dispatcher, `LocalBastionManager`. |
| **Hands System** | Autonomous background agents (Collector, Robotics, etc.) pulsing at scheduled intervals. | `src/robofang/core/hands.py`, `src/robofang/plugins/*_hand.py`. |
| **RoboFang Hub / Dashboard** | React/Vite UI on port 10864: fleet, hands, showrooms, deliberations. | `dashboard/`, `start.bat`. |

### 1.2 Data flow (high level)

- **User / Dashboard** → HTTP to Bridge (`/ask`, `/fleet`, `/logs`, `/deliberations`, `/api/llm/*`, `/api/help`, `/home/{connector}/...`) → Orchestrator (ask, council, RAG, tools) → Connectors and/or **MCP backends** (via HTTP proxy or connector-specific clients).
- **Bridge** exposes **both** HTTP API and **MCP 3.1 over SSE** (unified gateway). MCP clients connect to `http://localhost:PORT/sse` and get tools (robofang_status, robofang_ask, robofang_agentic_workflow, etc.). MCP backends are *called* by the Bridge when the orchestrator routes tool calls.
- **Federation map** (`configs/federation_map.json`): nodes, `enabled_connectors`, `council_members`, per-connector config (e.g. `mcp_backend`, `mcp_frontend`). Topology is loaded at startup.

### 1.3 Key HTTP endpoints (Bridge)

| Endpoint | Purpose |
|----------|---------|
| `GET /health`, `GET /system` | Health and system info; connector states. |
| `GET /fleet` | Full fleet registry (live connectors + federation map domains). |
| `GET /logs` | Ring-buffer logs (level, category, source, since_id). |
| `GET /deliberations` | Reasoning log (council / ReAct steps). |
| `POST /ask` | Main entry: ask the orchestrator (optional council, RAG, refine). |
| `GET /api/llm/models` | Proxy to Ollama /api/tags (model list for dashboard). |
| `POST /api/llm/load` | Proxy to Ollama /api/load (load model into memory). |
| `POST /api/llm/generate` | Proxy to Ollama /api/generate (inference test). |
| `GET /api/help` | Structured MCP help (tools, council, connection, skills). |
| `GET /sse` | MCP 3.1 over SSE — Cursor/Claude connect here. |
| `GET/POST /home/{connector}/{path}` | Reverse proxy to `MCP_BACKENDS[connector]`. |
| `GET /home` | Reachability check for all MCP backends. |
| `POST /api/fleet/launch` | Launch an MCP app via its `start.ps1` (path under `D:/Dev/repos`). |

---

## 2. robofang-mcp (implemented)

### 2.1 What robofang-mcp is

**robofang-mcp** is a **Model Context Protocol (MCP) server** that exposes RoboFang's orchestration to the rest of the MCP ecosystem. Today, Cursor, Claude Desktop, and other MCP clients can talk to individual MCP servers (Plex, Calibre, yahboom, etc.) but have no standard way to *drive the Sovereign Hub*—they would need to call the Bridge’s HTTP API directly, which is off-protocol.

robofang-mcp would:

- Run as a separate process (or same process, separate transport) that speaks **MCP** (e.g. stdio or SSE).
- Expose **tools** such as: `robofang_ask`, `robofang_council`, `robofang_fleet_status`, `robofang_rag_query`, `robofang_launch_app`, `robofang_get_deliberations`, etc.
- Optionally expose **resources** (e.g. `robofang://fleet`, `robofang://logs`) for read-only fleet state and logs.
- **Under the hood**: each tool implementation would call the RoboFang Bridge over HTTP (e.g. `POST http://localhost:10867/ask` or whatever port the bridge runs on).

So: **Bridge = HTTP hub and brain; robofang-mcp = MCP adapter so that any MCP client can use that brain with one config entry.**

### 2.2 How to use it

1. Start the RoboFang bridge (port 10871). 2. Run `pip install -e robofang-mcp` then `robofang-mcp` or `robofang-mcp --sse`. 3. In Cursor/Antigrav: add MCP server, command `robofang-mcp`. 4. Optional: run the robofang-mcp webapp (see robofang-mcp/README.md).

**Bootstrap / alternate setup:** robofang-mcp can be an **alternative way to setup or bootstrap** the main RoboFang stack. IDE-first: install robofang-mcp and add it to Cursor/Antigrav before the bridge or hub are running; use `robofang_bootstrap_check`, `robofang_bootstrap_guide`, `robofang_help`, and `robofang_agentic_workflow` to guide setup. Paths: **classic** (install RoboFang, run bridge, run hub, optionally add robofang-mcp) or **MCP-first** (install robofang-mcp, add to IDE, use it to drive and bootstrap the rest).

### 2.3 Relationship to the Rust "robofang" (RightNow-AI)

The **RightNow-AI robofang** (Rust "agent OS", 2026) is a different product. This repo is the **Sandra-class Sovereign Orchestration Hub** (Python, Council, DTU, federation map). The Rust runtime could call this hub via HTTP or via **robofang-mcp**.


---

## 3. Suggestions to expand and improve

### 3.1 Revive and ship robofang-mcp

- **Add** an MCP server surface to the repo (recommended: `src/robofang/mcp_server.py` or a top-level `mcp/` package) that:
  - Uses FastMCP (or the project’s chosen MCP library) with stdio and/or SSE transport.
  - Reads Bridge base URL from env (e.g. `robofang_BRIDGE_URL`, default `http://localhost:10867`).
  - Defines tools: `robofang_ask(message, use_council, use_rag)`, `robofang_fleet_status()`, `robofang_deliberations(limit)`, `robofang_rag_query(query)`, `robofang_launch_app(repo_path)` (with safety checks), and any others that map cleanly from Bridge routes.
  - Optionally exposes resources for fleet and logs so clients can subscribe to state without polling tools.
- **Document** in README: how to run the Bridge, then robofang-mcp, and how to add robofang-mcp to Cursor/Claude Desktop so the hub appears as one more MCP server.
- **Port**: Choose a stable port for SSE (e.g. 10865) and document it in `mcp-central-docs` and fleet manifests so the Sovereign Hub is first-class in the fleet.

### 3.2 Unify MCP backend discovery with federation map

- Today `MCP_BACKENDS` in `main.py` is a hardcoded dict; connector URLs are also in `federation_map.json` (e.g. `mcp_backend`, `mcp_http`). **Recommendation**: derive the port map from the federation map (and optionally env overrides) so adding a new MCP server is a single edit in `configs/federation_map.json` and no code change in `main.py`. Backward compatibility: if a key is in `MCP_BACKENDS` but missing in config, keep current behaviour or document the migration.

### 3.3 Tool bridge and MCP tool schema

- The orchestrator’s `_tool_registry` is built from skills and connectors with minimal schema (`type`, `id`/`instance`, `description`). **Recommendation**: (1) Let each connector (and each skill) optionally expose a **structured tool schema** (name, description, parameters) so the ReAct loop and any future robofang-mcp can present accurate tool definitions. (2) For MCP backends, consider optional **dynamic discovery**: call each backend’s `tools/list` (or equivalent) and merge into the tool bridge so RoboFang can invoke remote MCP tools by name and params instead of opaque proxy.

### 3.4 Council and Dark Integration

- **Enrich / Execute / Audit** are documented; ensure the reasoning log and `/deliberations` always receive entries for each phase so the dashboard and future MCP resources show a full audit trail. If DTU or Bastio blocks an action, log that too with a clear reason.
- **Adjudicator prompts**: keep `configs/council_debate_prompt.md` (and env override `robofang_council_PROMPT`) as the single source of truth; consider one prompt per adjudicator role (Foreman, Satisficer, Instigator, Architect, etc.) for easier tuning.

### 3.5 Security and safety

- **Bastio**: move toward **signature verification** of Foreman specs so only signed specifications can be executed when enforce mode is on.
- **Launch endpoint** (`/api/fleet/launch`): path is restricted to `D:/Dev/repos`; consider making the allowed base path configurable (env or federation map) and logging all launch requests for audit.
- **Sensitive tools**: `OrchestrationClient.SENSITIVE_TOOLS` is a good start; ensure any robofang-mcp tool that can trigger them (e.g. `robofang_ask` with a prompt that leads to email/Discord) is documented and, if needed, gated by the same security layer (e.g. subject/role).

### 3.6 Observability and operations

- **Health propagation**: have the Bridge expose a simple **fleet health summary** (e.g. `/fleet/health`) that aggregates connector and MCP backend reachability so robofang-mcp can expose a single “fleet healthy” resource or tool.
- **Structured logs**: the ring buffer is in-memory; for production, add optional **file or syslog sink** with rotation so deliberations and security-relevant events survive restarts and can be audited.
- **Dashboard**: ensure the dashboard’s CORS and API base URL work when the Bridge runs on a non-default port or host; document `robofang_BRIDGE_URL` (or equivalent) for the frontend.

### 3.7 Connectors and federation

- **Yahboom / robotics**: add yahboom-mcp (and optionally other robotics MCPs) to the federation map and, if desired, to `MCP_BACKENDS` so the dashboard and robofang-mcp can proxy or reason over robot control (e.g. “ask robofang to have the council plan a patrol” → council → tool call to yahboom).
- **Resonite / VRChat**: connectors exist in config; when enabled, ensure they receive the correct backend URL and that the Bridge (or robofang-mcp) can invoke them for in-world actions from a single prompt.

### 3.8 Documentation and onboarding

- Add a **QUICKSTART.md** in `docs/`: (1) install and run Bridge, (2) run Dashboard, (3) optional: run robofang-mcp and add to Cursor, (4) one example “ask” and one “council” flow.
- In README, add a **“Relationship to MCP”** subsection: “RoboFang Bridge is an HTTP hub that calls MCP backends; robofang-mcp (when enabled) exposes the hub over MCP so that any MCP client can drive the Sovereign layer.”

---

## 4. Summary

| Area | Current state | Suggested direction |
|------|----------------|---------------------|
| **robofang-mcp** | Implemented in `robofang-mcp/`; optional webapp in `webapp/` | Keep tool schemas in sync with Bridge; document in README and QUICKSTART. |
| **MCP backend map** | Hardcoded in `main.py` | Derive from `federation_map.json` (+ env override); single place to add new backends. |
| **Tool bridge** | Skills + connectors, minimal schema | Structured tool schemas per connector/skill; optional MCP tools/list discovery for backends. |
| **Council / Dark** | 3-phase flow, reasoning log | Ensure all phases and Bastio/DTU outcomes logged; consider per-role prompts. |
| **Safety** | DTU, Bastion, Bastio | Bastio: spec signing; launch: configurable base path + audit log. |
| **Observability** | Ring buffer, /logs, /deliberations | Optional persistent log sink; /fleet/health for aggregated health. |
| **Federation** | federation_map + connectors | Add yahboom (and others) to map; document; ensure dashboard and robofang-mcp can use them. |
| **Docs** | README, SAFETY.md | QUICKSTART.md; README subsection “Relationship to MCP” and robofang-mcp. |

This document should be updated when robofang-mcp is implemented or when the Bridge API or federation map schema change in a way that affects the roadmap.
