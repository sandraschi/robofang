# Changelog

All notable changes to RoboFang are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · Semantic Versioning.

---

## [Unreleased]

- **Bumi Sim2Real**: Researching integration for Noetix Bumi virtual embodiment.

## [12.6.0] — 2026-03-29

### Added
- **Ollama Native Tool-Use**: Refactoring the ReAct loop to use Ollama's native `/api/chat` tools API instead of XML regex parsing (Improves reliability for 3B-8B models).

## [12.5.0] — 2026-03-29

### Added
- **Security Moat Layer**: Integrated **Bastio** (input validation) and **DefenseClaw** (action sandboxing) into `OrchestrationClient`.
- **Connector Hardening**: Formalized `.ping()` standard; bridge `/test` API now performs real-time liveness verification.
- **Posture Dashboard**: New "Integrations Hub" in frontend with "Coming Soon" badges for roadmap transparency.

### Added
- **Docs / fleet**: **bumi-mcp** live repo + dashboard ports **10774/10775** — [integrations/bumi-mcp.md](docs/integrations/bumi-mcp.md), [MCP_SERVERS.md](docs/MCP_SERVERS.md) §3.4, [integrations/README.md](docs/integrations/README.md), [fleet-registry.json](src/robofang/configs/fleet-registry.json) card.
- **Docs**: [MCP_SERVERS.md](docs/MCP_SERVERS.md) §2 — repo bar: **`llms.txt` + `llms-full.txt` (required pair)**, **pre-commit+Ruff**, **ty** (non-blocking CI), plus uv / glama / `mcpb pack` (mcp-central-docs **PACKAGING_STANDARDS §5–6**, [llms-txt-manifest](https://github.com/sandraschi/mcp-central-docs/blob/master/integrations/llms-txt-manifest.md)).

### Added
- **Yahboom MCP** (`hands/yahboom-mcp`): New hand with robot tools (`get_status`, `patrol_with_recording`) and **speech tools** that add on top of Speech-MCP — `robot_speech_say(text)` (onboard Yahboom Voice Module TTS), `speech_mcp_tts(text, provider, send_to_robot)` (Speech-MCP TTS with optional play on robot). Bridge and hub use GET `/status` and POST `/tool`; default port 10833. Env: `YAHBOOM_ROBOT_URL`, `SPEECH_MCP_BACKEND_URL`.
- **Docs**: ROBOTICS.md — "Speech and audio" section (Yahboom Voice Module + yahboom-mcp; Dreame preset-only, no arbitrary TTS/audio). ROUTINES_DAWN_PATROL.md — reference to hands/yahboom-mcp. connector_taxonomy.md — yahboom in Robotics table.

---

## [2.1.0] — 2026-02-26

### Added
- **Neural Media RAG Portmanteau** (`tools/RoboFang_rag.py`): Integrated LanceDB semantic search capabilities directly into RoboFang. The `@mcp.tool()` `RoboFang_rag` allows natural language querying of media databases with an internal Delta-Sync caching system to rapidly isolate unindexed items.

---

## [0.1.0-alpha.1] — 2026-03-13

First alpha release. MCP & robots hub: bridge, supervisor, hub (Vite), fleet installer, startup and error-handling fixes.

### Added
- **Dependencies (pyproject.toml)**: `tomli`, `pyyaml`, `requests`, `watchdog`, `structlog` so bridge and repo_watcher import without missing-module failures. CI guard: `tests/test_bridge_import.py` imports hand_manifest, installer, skills, repo_watcher.
- **Bridge crash logging**: Supervisor writes bridge stdout/stderr to `temp/bridge_stdout.log`; on bridge crash, supervisor logs ERROR with last 30 lines. Start.ps1 shows that log and supervisor stderr when bridge does not respond.
- **Run bridge in console**: `run_bridge_console.bat` / `run_bridge_console.ps1` at repo root to run the bridge in the foreground and see tracebacks.

### Changed
- **Start entry points**: Primary start is `.\robofang-hub\start.bat`. Root `.\start.bat` also works (calls `start_all.ps1`, which runs setup if needed then hub start). Both documented in README and INSTALLATION.md.
- **Setup / start and pip**: `setup.ps1` and `robofang-hub\start.ps1` use `python -m ensurepip` / `python -m pip` so they work when `.venv` has no `pip.exe`. Setup ensures pip exists before `pip install -e .`.
- **Error handling**: No silent failures—pip install errors surface; port-clear logs what was killed; bridge wait loop shows last error every 5s; bridge startup and main() catch exceptions, log traceback, exit 1. Supervisor sets `PYTHONUNBUFFERED=1` for the bridge so tracebacks appear immediately in logs.
- **Hub only after bridge**: Start.ps1 does not launch the hub until the bridge responds; on failure it exits 1 and prints last 50 lines of `temp/bridge_stdout.log` and last 20 of supervisor stderr.

### Fixed
- **Bridge crash on start**: Missing `tomli` (hand_manifest) and optional missing `pyyaml` (installer/skills) caused bridge to exit 1. All required deps are now in pyproject.toml and covered by import tests.
- **Venv without pip**: If `.venv` existed but had no `pip.exe`, setup and “ensure deps” failed. Scripts now use `python -m pip` and setup runs `ensurepip` when needed.
- **Root start.bat**: Root `start.bat` now does `cd /d "%~dp0"` so it works from any current directory; `start_all.ps1` sets `Set-Location $RepoRoot` before invoking the hub script.

---

## [Unreleased] — 2026-03-12

### Added
- **Single-command launch**: `start_all.ps1` brings up supervisor (10872), bridge (10871), and hub (10870) ready for MCP/LLM/auth configuration. Root `start.bat` invokes it for double-click or cmd.
- **Fleet cards**: Connector cards show server status (from MCP status tool where available) and "Open webapp" / "Start webapp" (launch from repo_path, then open URL).
- **Install to register to launch**: After Installer (catalog) install completes, hub auto-registers the connector in the bridge topology and launches it once; connector then auto-starts on every robofang start.
- **Bridge API**: `GET /api/connectors/{id}/status` (health/status/tool-based), `GET /fleet` includes `repo_path`; `GET /api/fleet/installer-catalog` (Installer server list); `POST /api/fleet/register`, `POST /api/connector/launch/{id}`.
- **Testing**: `tests/conftest.py` (mocked orchestrator), `tests/test_bridge_fleet.py` (GET /fleet, POST register, GET connector status 404, GET /health), `docs/TESTING.md` (pytest commands, manual install flow, API checks).
- **Backup**: `scripts/backup-repo.ps1` (SOTA script from fleet; run from repo root).
- **Dark App Factory**: Fleet registry entry and `configs/federation_map.json` connector (dashboard 8002, enabled: false).

### Changed
- **Safe startup (default)**: Docs and behavior default to starting robofang only; webapps started on-demand or in small batches. Full fleet at once is opt-in only.
- **Docs**: INSTALLATION.md references robofang-hub (not dashboard), start.bat, and "ready for configuration" flow. Hub URL and config steps clarified.
- **Fleet Installer naming**: Removed "market" everywhere. Bridge route `GET /api/fleet/market` → `GET /api/fleet/installer-catalog` (response key `catalog`). Hub uses `getFleetCatalog()` and catalog state only. See CONTRIBUTING_MCP_AND_HANDS.md terminology.
- **CONTRIBUTING_MCP_AND_HANDS.md**: Terminology (catalog vs hands), References updated for installer-catalog; new section **OpenFang vs RoboFang hands (keep separate)** so OpenFang-style hands (imported, tool-mapped) stay distinct from native hand levels (core / bundled / installable). Section renumbering (3 → 4, 4 → 5).
- **TESTING.md**: "market node" → "catalog entry" in manual install steps.

---

## [Unreleased] — 2026-02-25 (Session 2)

### Added
- **Embodied Council Members** (`tools/osc_council_bridge.py`): Resonite vbots and
  virtual sensor agents (e.g. Dreame D20 Pro robohoover) can now participate in the
  Council of Dozens via OSC round-trip. URL scheme: `resonite://host:port/label` or
  `osc://host:port/label` in `RoboFang_COUNCIL_MODELS`.
- **Cloud SaaS Adviser Bridge** (`tools/cloud_council_bridge.py`): Unified async
  interface covering Groq, DeepSeek, Together.ai, HuggingFace Inference API, OpenAI,
  and Moonshot (Kimi). Hard cost guard per call (`RoboFang_CLOUD_BUDGET_USD`, default
  $0.05). URL scheme: `groq://model`, `deepseek://model`, `hf://org/model`, etc.
- **Cloud Adviser Registry** (`configs/council_advisers.json`): Maintained list of
  providers, models, cost-per-million-token annotations, specialisation notes, and
  tiebreaker policy configuration.
- **Automatic Tiebreaker**: When the Adjudicator-in-Chief's synthesis contains a
  deadlock signal ("split", "tied", "inconclusive", etc.), `tiebreaker_call()` selects
  the cheapest available cloud adviser and appends a casting vote to the synthesis.
- **Resonite ProtoFlux Guide** (`docs/RESONITE_COUNCIL_AGENT.md`): Full setup guide
  including OSC protocol, node wiring, D20 epistemic contribution example, and port
  allocation table.

### Changed
- `autonomous_council.py`: Per-adjudicator routing now supports three backends —
  Ollama, OSC/Resonite (embodied), and cloud SaaS — selected via URL scheme.
  `tiebreaker_invoked` bool added to session return dict.

---

## [2.0.1] — 2026-02-25 (Session 1 — Deficit Patches)

### Fixed
- **Council autonomy** (`autonomous_council.py`): Replaced `input()` harness with
  real `ReasoningEngine.ask()` calls. Each adjudicator gets a persona-specific system
  prompt and routes to a configurable Ollama model with retry logic.
- **Fleet forensics** (`mcp_server.py` — `sample_fleet_forensics`): Now feeds live
  `get_substrate_heartbeat()` data instead of hardcoded simulation data.
- **Fleet diagnostics** (`mcp_server.py` — `orchestrate_fleet_diagnostics`): Live
  heartbeat + real Ollama triage query replaces hardcoded stub.
- **Inter-agent ping** (`mcp_server.py` — `inter_agent_ping`): Real
  `socket.create_connection()` probes per node in `federation_map.json` replace
  hardcoded string.
- **ArXiv RAG bridge** (`tools/arxiv_rag_bridge.py`): Full rewrite — PyMuPDF →
  pdfminer.six → .txt sidecar extraction chain, abstract heuristic parser, arXiv ID
  extraction, ADN push with import/subprocess/print fallbacks.
- **`federated_agent_workflow`** (`mcp_server.py`): Restored `@mcp.tool()` decorator
  that was accidentally consumed by the previous orphaned edit.

### Added
- **`run_dark_integration` tool** (`mcp_server.py`): Exposes the fully implemented
  3-phase `orchestrator.process_mission()` pipeline (Enrich → ReAct → Satisficer) as
  an MCP-callable tool.

---

## [2.0.0] — 2026-02-25

### Added
- **Dark Integration Architecture**: New 3-phase reasoning pipeline (Enrich, Execute, Audit).
- **Specialized Council Roles**: Added support for `Foreman` (Planner) and `Satisficer` (Auditor/Judge).
- **Reasoning Log (Forensics)**: High-fidelity internal ring buffer in `OrchestrationClient` capturing all cognitive steps.
- **Observability Bridge**: New `/deliberations` API endpoint for real-time event streaming.
- **Council Dashboard v2**: Real-time visualization of agentic deliberations and consensus matrix.
- **Satisficer Audit**: Automated post-work verification loop ensuring specification compliance.

### Changed
- Refactored `OrchestrationClient` to use the unified `process_mission` workflow.
- Updated `Council.tsx` and `Deliberations.tsx` to handle live data streams.

### Fixed
- Improved inter-agent consensus stability.
- Reduced noise in tool execution logs via forensic buffering.
