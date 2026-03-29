# RoboFang: Comprehensive Technical Assessment
**Date:** 2026-03-10  
**Assessed by:** Claude Sonnet 4.6 (full repo read)  
**Status:** Active Development — Phase 4 per PRD  
**Version:** 0.3.0 (pyproject) / 2.1.0 (CHANGELOG)

---

## Executive Summary

RoboFang is a Python-based sovereign orchestration hub that has evolved significantly from its OpenFang/openfang roots into something substantially more ambitious. It is not simply an OpenClaw clone or wrapper — the codebase has been extensively rewritten with a coherent internal architecture, a large connector surface, a multi-agent Council of Dozens reasoning engine, an observability layer, a process supervisor, and a full React/Vite dashboard frontend. The scope is legitimate and the implementation quality is above average for a solo project of this scale, though several important components are partially implemented or have technical debt that needs addressing before the system can be called fully production-ready.

The project sits at the intersection of: MCP orchestration hub, smart home / media automation platform, local LLM reasoning engine, multi-agent deliberation system, virtual embodiment research platform, and robotics control layer. That is an unusually wide scope. The architecture holds together because the federation map and connector abstraction are sound, but execution depth varies significantly across subsystems.

---

## 1. Architecture Overview

### 1.1 Process Topology

The system runs as three cooperating processes:

```
Sovereign Dashboard (port 10864, React/Vite)
       ↕ REST/SSE
RoboFang Bridge (port 10871, FastAPI + FastMCP 3.1)
       ↕ process control
RoboFang Supervisor (port 10872, FastAPI)
```

The Bridge is the core: it hosts the FastAPI REST API, the FastMCP 3.1 SSE endpoint (`/sse`), the in-process `OrchestrationClient`, and acts as a reverse proxy to all 26+ MCP backend servers in the fleet. The Supervisor manages the Bridge subprocess lifecycle (start/stop/restart/auto-restart) and runs three background monitors: `HeartbeatManager`, `FleetHealthMonitor`, `SkillsWatcher`.

This is a well-thought-out layered architecture. The decision to co-locate the FastMCP server and the FastAPI bridge in a single process (using `FastMCP.from_fastapi()`) is correct for this scale and avoids unnecessary inter-process complexity.

### 1.2 Port Allocation

Ports are allocated in the `10700–10900` range:
- Bridge: `10871`
- Supervisor: `10872`
- Dashboard: `10864`
- MCP backends: distributed (10700 = virtualization, 10740 = plex, etc.)
- Prometheus/Grafana monitoring stack: separate docker-compose

The hardcoded port map in `main.py` (`MCP_BACKENDS` dict with 26 entries) is functional but will become a maintenance burden as the fleet grows. The `configs/federation_map.json` already has the correct data — the backend should derive the proxy table from the config at runtime, not from a duplicate hardcoded dict.

### 1.3 Federation Map

`configs/federation_map.json` is the single source of truth for the fleet topology. It is well-structured with separate sections for nodes, enabled_connectors, connectors (with per-connector config), and domains (a semantic taxonomy of all servers). The domain taxonomy (creative, knowledge, comms, system, hardware_iot, media, robotics_vr) is clean and gives Claude/Cursor useful navigation context when browsing the project.

The federation map is loaded once at startup. There is no hot-reload. Changing the map requires a Bridge restart.

---

## 2. Core Subsystems — Detailed Assessment

### 2.1 OrchestrationClient (`src/robofang/core/orchestrator.py`)

**Status: Substantially implemented, some gaps.**

The `OrchestrationClient` is the nerve center. It initialises and wires together: `PluginManager`, `MoltbookClient`, `ReasoningEngine`, `SkillManager`, `SecurityManager`, `SecretsManager`, `PersonalityEngine`, `KnowledgeEngine`, `HandsManager`, and `RoboFangStorage`. This is a large dependency graph but it is composed cleanly via constructor injection.

Strengths:
- Clean async lifecycle (`start()`/`stop()`)
- Connector auto-discovery with three-priority resolution (env var > federation_map.enabled_connectors > federation_map.connectors.*.enabled)
- Tool registry (`_tool_registry`) that flattens skills and connectors into a unified namespace
- Council Approval Gate for sensitive tools via `execute_tool()` with `approval_gate=True`
- Full 3-phase Dark Integration pipeline (`process_mission()`: Enrich → Execute → Audit)
- Reasoning log ring buffer (100 entries) for the Deliberations feed
- Auto-RAG: knowledge context retrieval on every `ask()` call when enabled

Gaps:
- `_heartbeat_loop()` currently posts to Moltbook as the only "proactive" action. No actual fleet health polling or connector reconnect logic that reports to the dashboard. The reconnect attempt is there but fires silently.
- `_build_tool_bridge()` registers connectors as opaque `connector_NAME` entries. The bridge cannot introspect *what* a connector can do — no schema. This means the ReAct loop cannot meaningfully use connector tools without knowing their capabilities.
- `process_mission()` passes a flat list of `{name, description}` tool dicts to `reason_and_act()`, but those names are `connector_plex`, `connector_calibre`, etc. — the LLM has no idea how to call them without capability descriptions. This is a significant gap for the ReAct loop to work in practice.

### 2.2 ReasoningEngine (`src/robofang/core/reasoning.py`)

**Status: Well-implemented core, federation routing partial.**

This is one of the better-written files in the project. The Ollama `/api/generate` integration is clean, the Council synthesis pipeline (parallel gather + Equilibrium Synthesizer pass) is correct, and the ReAct loop using XML `<thought>`/`<call>` tags is a reasonable implementation of the pattern.

Strengths:
- Council synthesis correctly runs all adjudicators in parallel via `asyncio.gather()`
- `council_adjudicate()` supports per-member role specialisation (Security Assessor, Architect, etc.)
- `enrich_vibe()` / `satisficer_judge()` implement the Foreman/Satisficer phases cleanly
- `refine_prompt()` is a useful preprocessing step
- `reason_and_act()` parses `<call name='...'>` XML with regex — works but fragile for edge cases

Gaps:
- The ReAct loop uses the `/api/generate` endpoint with a single prompt (no conversation history). This means each turn re-sends the full context as a string rather than using Ollama's chat endpoint (`/api/chat` with messages). For long ReAct chains, this leads to unbounded prompt growth.
- Remote node routing (`node@model` format) currently falls back to a direct Ollama proxy. The Substrate-to-Substrate protocol described in the comment is not implemented.
- Default model `llama3.2:3b` for council synthesis. This model is very small for adversarial reasoning. The `qwen2.5:7b` or `deepseek-r1:8b` configured in `federation_map.json` would be better defaults for council rounds.
- `council_synthesis()` uses the first member (`council_members[0]`) as the synthesizer. Using the best/largest model here would improve synthesis quality.

### 2.3 Connectors (`src/robofang/core/connectors.py`)

**Status: Impressively complete — 13 real connectors.**

This is the most substantial file in the project at 64KB. All connectors implement the `BaseConnector` ABC correctly (`connect`, `disconnect`, `send_message`, `get_messages`). Heavy imports are deferred properly.

Real implementations: `MoltbookConnector`, `EmailConnector` (stdlib smtplib+imaplib), `TapoConnector` (python-kasa), `HueConnector` (phue), `ShellyConnector` (httpx Gen1/Gen2), `HomeAssistantConnector` (REST + WebSocket), `RingConnector` (ring_doorbell), `PlexConnector` (plexapi), `CalibreConnector` (subprocess calibredb), `DiscordConnector` (discord.py async), `ResoniteConnector` (WebSocket via ResoniteLinkClient), `MCPBridgeConnector` (generic FastMCP bridge with sidecar auto-start).

`IoTConnector` is correctly deprecated in favour of the specific connectors.
`SocialConnector` is a stub — fine since Discord covers it.

`MCPBridgeConnector` is architecturally elegant: one class handles any FastMCP HTTP server, supports optional sidecar auto-start, and implements `call_tool()` returning structured data (not just bool). This is the correct design for bridging to the fleet servers (blender-mcp, calibre-mcp, etc.).

Issues:
- `EmailConnector.connect()` and `get_messages()` use `asyncio.get_event_loop()` which is deprecated in Python 3.10+. Use `asyncio.get_running_loop()` instead.
- `DiscordConnector` starts a long-running `client.start(token)` task via `create_task()`. If the task crashes, it is not restarted. The heartbeat loop would attempt reconnect but would not recreate the task.
- `TapoConnector.connect()` does device discovery per call. For large device lists this is slow and will block startup. Should be parallelised with `asyncio.gather()`.
- `HomeAssistantConnector` does not cache auth headers per session — fine for now but will need optimisation under load.

### 2.4 Supervisor (`src/robofang/supervisor.py`)

**Status: Solid process manager, good bonus features.**

The `BridgeProcess` class is a proper thread-safe subprocess manager with log ring buffer (500 lines), crash detection, auto-restart capability, and clean start/stop/restart API. The `FleetHealthMonitor` polls fleet nodes from the registry JSON and computes a cohesion score. `SkillsWatcher` auto-discovers repos by looking for `mcpb.json`, `mcp.json`, or `SKILL.md` — good auto-discovery heuristic for the Sandra-class fleet.

Issues:
- `FleetManager.install()` hardcodes GitHub URL as `https://github.com/sandraschi/{node_id}.git` — this works only for your own repos. External repos need a `repo_url` field in the registry.
- `AUTO_RESTART = False` by default is safe but should be documented in the dashboard UI as a user-facing toggle with consequence explanation.
- The fleet registry path (`D:\Dev\repos\mcp-central-docs\operations\fleet-registry.json`) is hardcoded. If the file doesn't exist, `FleetHealthMonitor._check_fleet()` silently does nothing. Should log a startup warning.

### 2.5 Autonomous Council (`tools/autonomous_council.py`)

**Status: Architecturally complete, dependent on other tools being present.**

The `AutonomousCouncil` class orchestrates the 12-adjudicator debate loop. It correctly handles three backend types: Ollama (standard path), OSC/Resonite (embodied path via `osc_council_bridge.py`), and Cloud SaaS (via `cloud_council_bridge.py`). The tiebreaker logic (escalates to cheapest cloud adviser on "split"/"tied"/"inconclusive" in synthesis) is an elegant addition.

The structure of writing round outputs to disk via `CouncilOrchestrator`, then synthesising to an `exchange/synthesized/` file is correct for an audit trail. The `exchange/sandbox/` directory shows 22 task runs, confirming active usage.

Issues:
- The `council_orchestrator.py` import is a local-path import (`sys.path.insert` to `tools/`). This means `autonomous_council.py` can only be run from `tools/` or with explicit path manipulation. Should be a proper package import.
- `tiebreaker_call()` is called unconditionally after synthesis. If cloud budgets are tight (`ROBOFANG_CLOUD_BUDGET_USD=0.05`), this fires on any ambiguous synthesis. Consider making the keyword list configurable.
- The `ADJUDICATORS` list is defined in `council_orchestrator.py` (not read here). With 12 adjudicators running sequentially on a 7B model, a full session takes roughly 12 × 30s = ~6 minutes. This is fine for deliberative tasks but should be documented.

### 2.6 Dashboard (`dashboard/`)

**Status: Built and running, React/Vite/Tailwind stack.**

The dashboard has a React/Vite/TypeScript stack with Tailwind CSS, Framer Motion, Lucide icons, React Router. The `dist/` directory exists (built), `node_modules` is present (installed). Glassmorphism/dark mode aesthetic per the PRD design spec.

Pages observed from directory structure: `api/`, `components/`, `pages/` — standard SPA layout.

**Critical issue:** The CORS whitelist in `main.py` includes only ports `10870`, `10871`, `5173`. The README says dashboard is at `10864`. The PRD says `10864`. The `supervisor.py` CORS whitelist allows `10864`. But `main.py` bridge CORS allows `10870` and `5173` only. This means the production dashboard (port 10864) cannot call the bridge API without a CORS error unless it goes through the Vite dev proxy.

**Port confusion:** Multiple conflicting port references across docs — PRD says `10864` for dashboard, `10865` for bridge; `main.py` defaults to `10871`; supervisor manages `10871`; supervisor itself is `10872`. The docs need a single authoritative port table.

### 2.7 Monitoring Stack (`containers/`, `docker-compose.monitoring.yml`)

**Status: Config present, not integrated with bridge metrics.**

Prometheus + Loki + Grafana + Promtail stack via Docker Compose. The Prometheus config, Loki config, and Grafana datasources are present in `configs/`. The bridge does not currently expose a `/metrics` endpoint — Prometheus would have nothing to scrape from RoboFang itself, only OS-level metrics from node_exporter (if configured).

This is a reasonable future-state setup but is currently disconnected from the application layer.

---

## 3. Dependency Audit

### 3.1 FastMCP Version

`pyproject.toml` specifies `fastmcp>=3.1.0`. The fleet SOTA is `fastmcp>=3.0.0` (per recent memory update from Feb 18, 2026). RoboFang is ahead of fleet SOTA here — 3.1.0 is the latest GA. The `FastMCP.from_fastapi()` pattern used in `main.py` is the correct 3.1 unified gateway approach.

### 3.2 Python Version

`requires-python = ">=3.11"`. Correct. No issues.

### 3.3 Notable Dependencies

- `lancedb>=0.4.0` + `fastembed>=0.3.0` for RAG — correct choice for local vector search on Windows, no Docker required.
- `discord.py>=2.3` — async-native, correct.
- `python-kasa>=0.7` — correct for Tapo devices.
- `ring-doorbell>=0.8` — correct.
- Missing: `python-osc` for the OSC council bridge — not in `pyproject.toml` but required by `autonomous_council.py`. This will cause a silent import error at runtime if the OSC path is triggered.
- Missing: `pdfminer.six` / `PyMuPDF` — the ArXiv RAG bridge references these but they're not in `pyproject.toml`.

### 3.4 Build System

Uses `setuptools` (not `hatchling`). The `uv.lock` file is present for reproducible installs. The `.venv/Scripts/` shows both `openfang-bridge.exe` and `robofang-bridge.exe` — the rename was applied to `pyproject.toml` but the old entry points linger in the venv. A `uv sync` after the rename should fix this.

---

## 4. Code Quality

### 4.1 Strengths

- Consistent async/await patterns throughout
- Proper use of `abc.ABC` for `BaseConnector` — enforces contract
- Deferred heavy imports inside `__init__` / methods (connectors.py) — correct pattern for startup performance
- Pydantic request/response models on all REST endpoints
- Structured logging via `_RingHandler` to the in-memory buffer with level categorisation
- `SENSITIVE_TOOLS` set with `approval_gate` logic — shows security awareness
- `.pre-commit-config.yaml` and `.github/workflows/ci.yml` present — CI hygiene

### 4.2 Technical Debt

- **Backup files:** Multiple `.backup` files scattered throughout (`connectors.py.backup`, `orchestrator.py.backup`, `App.tsx.backup`, `main.py.backup`, `main.py.wave2.bak`). These should be removed and tracked in git history instead.
- **Hardcoded paths:** `D:/Dev/repos` appears in `supervisor.py`, `main.py`, and multiple scripts. Should be centralised into a single `config.py` or environment variable with a sensible default.
- **Dual MCP_BACKENDS dict:** The `MCP_BACKENDS` dict in `main.py` duplicates data from `federation_map.json`. Runtime derivation from the config is cleaner.
- **`bastio.py` vs `bastion.py`:** Two files with similar names in `core/` — likely a typo artifact during rename. One is probably superseded.
- **`robofang_test.db` in repo root:** SQLite test DB committed to the repo. Should be in `.gitignore`.
- **`data/robofang.db` and `data/benchmarks/`:** Runtime data directories. Fine to have the directory structure, but the actual DB and benchmark JSONs should be gitignored.
- **`exchange/sandbox/`:** 22 task sandbox directories from actual runs committed to the repo. These are runtime artefacts and should be gitignored (keep directory structure, ignore contents).
- **`sessions/resonite_engine.json`:** Runtime session state committed to repo.

### 4.3 Error Handling

Generally adequate. Most async methods have try/except with logger.error(). The connector layer degrades gracefully — failed connects set `self.active = False` but do not crash the bridge. The proxy routes return `503`/`504` JSON on backend unavailability rather than propagating exceptions.

One gap: `OrchestrationClient._load_topology()` silently sets `self.topology = {}` on failure. Downstream code does `topology.get("connectors", {})` etc., which will produce an empty fleet rather than an error. A startup health check endpoint should report topology load failure explicitly.

---

## 5. The OpenClaw++ / OpenFang++ Claim

The README positions RoboFang as an evolution of [RightNow-AI/OpenFang](https://github.com/RightNow-AI/openfang). Let's assess that claim honestly.

**Where RoboFang exceeds OpenFang/OpenClaw:**

1. **Multi-agent Council with adversarial synthesis** — OpenClaw has a basic tool-use loop. RoboFang has a 12-adjudicator debate system with role specialisation, tiebreaker escalation, and a full audit trail. This is genuinely more sophisticated.

2. **Connector depth** — 13 real connectors (not stubs) covering IoT, smart home, media, comms, VR, email. OpenFang's connector surface is smaller and less mature.

3. **Virtual-first embodiment research layer** — The Resonite/OSC pipeline, WorldLabs integration planning, and URDF→VRM→ProtoFlux agent embodiment approach is unique. OpenFang has no equivalent.

4. **Sovereign inference** — The explicit cost-sovereignty architecture (RTX 4090 running 70B models at zero per-token cost) with `local-llm-mcp` as a swappable backend is a principled design decision, not just a configuration option.

5. **Process supervision** — `supervisor.py` is a proper process manager with health monitoring, crash detection, fleet auto-discovery, and market-style installation. OpenFang has no equivalent.

6. **Observability** — The `/logs` ring buffer, `/deliberations` forensic trace stream, and Prometheus/Loki/Grafana stack (even if not fully wired) represent an observability investment absent from the upstream project.

**Where the claim needs hedging:**

- The 3-phase Dark Integration pipeline (Enrich → Execute → Audit) works end-to-end in code, but the ReAct loop's effectiveness depends entirely on the LLM reliably generating `<call name='...'>` XML. At 3B–7B model sizes, this is hit-or-miss. The system needs structured output / JSON mode or tool_use API (Ollama supports this since 0.3) to be reliable.
- "OpenFang++" implies feature completeness relative to OpenFang's roadmap. Several RoboFang features are architectural blueprints more than battle-tested implementations (WorldLabs pipeline, physical robotics Unitree integration, ROS2 bridge).
- The dashboard CORS issue means the system may not work out-of-box without Vite dev server — that is a significant usability gap.

**Verdict:** The "OpenFang++" framing is defensible for the orchestration and multi-agent layers. The "OpenClaw++" framing is more of a vision statement — the physical robotics layer is present in architecture but the actual Unitree hardware integration code is in the `fleet/` structure but not substantiated in the Python source.

---

## 6. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Dashboard CORS misconfiguration — port 10864 not whitelisted in bridge | **High** | Add 10864/127.0.0.1:10864 to `allow_origins` in `main.py` |
| 2 | ReAct XML parsing fragile at small model sizes | **High** | Switch to Ollama `/api/chat` with `tools` parameter (structured tool use) |
| 3 | `python-osc` not in `pyproject.toml` but required for OSC council path | **Medium** | Add `python-osc>=1.8` to pyproject.toml |
| 4 | `asyncio.get_event_loop()` deprecated in Python 3.10+ (connectors.py) | **Medium** | Replace with `asyncio.get_running_loop()` |
| 5 | Hardcoded `D:/Dev/repos` across multiple files | **Low** | Centralise to `ROBOFANG_REPOS_ROOT` env var |
| 6 | Runtime artefacts committed to git (sandbox tasks, session JSON, test DB) | **Low** | Update `.gitignore` |
| 7 | `bastio.py` vs `bastion.py` naming collision in `core/` | **Low** | Audit, remove superseded file |
| 8 | Council synthesis quality at 3B model sizes | **Low** | Document recommended minimum model: `qwen2.5:7b` or `deepseek-r1:8b` |
| 9 | Monitoring stack (Prometheus/Grafana) not connected to application | **Low** | Add `/metrics` FastAPI endpoint or `prometheus-fastapi-instrumentator` |

---

## 7. Immediate Recommended Actions (Prioritised)

### Priority 1 — Fix before sharing/publishing

1. **Fix CORS in `main.py`**: Add `http://localhost:10864` and `http://127.0.0.1:10864` to `allow_origins`. Also reconcile the port numbering across all docs — pick one canonical set.

2. **Add `python-osc` to `pyproject.toml`**: The OSC council path will fail silently otherwise.

3. **Switch ReAct to Ollama chat + tools API**: The `reason_and_act()` method should use `/api/chat` with Ollama's native tool_use format instead of XML string parsing. This makes the ReAct loop model-agnostic and far more reliable.

### Priority 2 — Quality of life

4. **Purge `.backup` files**: Commit them to git history and delete from working tree.

5. **Update `.gitignore`**: Add `exchange/sandbox/*/`, `sessions/*.json`, `data/*.db`, `data/benchmarks/`, `robofang_test.db`, `grafana-data/`, `prometheus-data/`, `memory/`.

6. **Derive `MCP_BACKENDS` from `federation_map.json`**: Remove the duplicate hardcoded dict in `main.py`. Load at startup from config.

7. **Fix `asyncio.get_event_loop()` → `asyncio.get_running_loop()`** in `connectors.py` (EmailConnector, HueConnector, RingConnector, PlexConnector, CalibreConnector).

### Priority 3 — Structural improvements

8. **Add `/metrics` endpoint** using `prometheus-fastapi-instrumentator` to connect the application to the Prometheus stack.

9. **Capability schema on connectors**: Each connector should expose a `get_capabilities()` method returning a schema the tool bridge can pass to the ReAct LLM. Without this, the ReAct loop cannot use connectors effectively.

10. **Make council models configurable per role via `federation_map.json`**: Move `ADJUDICATOR_MODELS` config from env var to a dedicated `council_config` section in the federation map, loaded at startup.

---

## 8. What Is Working Well

- The federation map design is clean and extensible.
- The connector abstraction is genuinely good engineering — the `MCPBridgeConnector` pattern is elegant.
- The supervisor architecture (BridgeProcess + FleetHealthMonitor + SkillsWatcher as background threads) is the right design for a Windows-native orchestration platform.
- FastMCP 3.1 unified gateway (`from_fastapi`) is the correct current approach.
- The Council's tiebreaker-to-cloud pattern solves the "split council" problem elegantly with a cost guard.
- The `_RingHandler` in-memory log buffer with `/logs` polling endpoint is a good lightweight alternative to a full log aggregation stack for the dashboard.
- The "Virtual-First Policy" in the PRD is a sound engineering discipline — validate behaviour in Resonite before committing to physical hardware.
- The templates system (`SOUL.md`, `HEART.md`, `BODY.md`) for persona synthesis is an interesting approach to agent identity that goes beyond simple system prompts.

---

## 9. Complexity Assessment

For context on "how complex is this repo":

- **270 files, 489 directories** (excluding .git and node_modules)
- **Core Python source**: ~180KB across `src/robofang/` 
- **Connectors alone**: 64KB — larger than most entire MCP servers in the fleet
- **Tools (orchestration scripts)**: 20+ Python files
- **Dashboard**: Full React SPA with routing, Tailwind, Framer Motion
- **Config surface**: Federation map, council advisers, MCP sidecars, Prometheus, Loki, Promtail
- **Documentation**: 14 docs files including detailed philosophical/architectural docs
- **Test coverage**: 15 test files across connector tests and workflow tests
- **Monitoring stack**: Full Prometheus/Grafana/Loki stack with custom Dockerfiles

This is a substantial project. The scope is genuinely ambitious — larger than any individual MCP server in the fleet by a significant margin. The appropriate comparison is not with a single-domain MCP server but with a platform like Home Assistant (in terms of connector surface) or LangGraph (in terms of agent orchestration depth), albeit at a smaller scale.

---

*Assessment complete. Written to repo root as `ASSESSMENT.md`.*
