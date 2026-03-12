# Changelog

All notable changes to RoboFang are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · Semantic Versioning.

---

## [2.1.0] — 2026-02-26

### Added
- **Neural Media RAG Portmanteau** (`tools/RoboFang_rag.py`): Integrated LanceDB semantic search capabilities directly into RoboFang. The `@mcp.tool()` `RoboFang_rag` allows natural language querying of media databases with an internal Delta-Sync caching system to rapidly isolate unindexed items.

---

## [Unreleased] — 2026-03-12

### Added
- **Single-command launch**: `start_all.ps1` brings up supervisor (10872), bridge (10871), and hub (10870) ready for MCP/LLM/auth configuration. Root `start.bat` invokes it for double-click or cmd.
- **Fleet cards**: Connector cards show server status (from MCP status tool where available) and "Open webapp" / "Start webapp" (launch from repo_path, then open URL).
- **Install to register to launch**: After market install completes, hub auto-registers the connector in the bridge topology and launches it once; connector then auto-starts on every robofang start.
- **Bridge API**: `GET /api/connectors/{id}/status` (health/status/tool-based), `GET /fleet` includes `repo_path`; `POST /api/fleet/register`, `POST /api/connector/launch/{id}`.
- **Testing**: `tests/conftest.py` (mocked orchestrator), `tests/test_bridge_fleet.py` (GET /fleet, POST register, GET connector status 404, GET /health), `docs/TESTING.md` (pytest commands, manual install flow, API checks).
- **Backup**: `scripts/backup-repo.ps1` (SOTA script from fleet; run from repo root).
- **Dark App Factory**: Fleet registry entry and `configs/federation_map.json` connector (dashboard 8002, enabled: false).

### Changed
- **Safe startup (default)**: Docs and behavior default to starting robofang only; webapps started on-demand or in small batches. Full fleet at once is opt-in only.
- **Docs**: INSTALLATION.md references robofang-hub (not dashboard), start.bat, and "ready for configuration" flow. Hub URL and config steps clarified.

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
