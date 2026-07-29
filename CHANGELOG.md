# Changelog

All notable changes to RoboFang are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · Semantic Versioning.

---

## [1.8.0-alpha.3] — 2026-07-29 "Assess & Fix Pass 2"

### Added
- **run_server.py**: PyInstaller dual-transport entry point for NSIS backend build.
- **robofang-backend.spec**: PyInstaller spec file for frozen binary.
- **robofang_shutdown**: MCP tool for graceful server shutdown (confirm=True).
- **Session context injection**: `.claude-plugin/plugin.json` + `hooks/hooks.json`
  for Claude Code; `.windsurfrules` for Windsurf; `.github/copilot-instructions.md`
  for GitHub Copilot; `.opencode/skills/robofang/SKILL.md` for OpenCode.
- **.gitattributes**: LF normalization for cross-platform safety.
- **Docstring standards**: `## Return Format` and `## Examples` added to all
  7 MCP tools (robofang_status, robofang_help, robofang_ask, robofang_fleet,
  robofang_deliberations, robofang_agentic_workflow, robofang_shutdown).
- **justfile**: Added `certify`, `gates-green`, `mcpb-pack`, `e2e`,
  `cua-nsis-test`, `bootstrap` recipes.
- **backend.rs**: Multi-layer free_port (Stop-Process → taskkill → UAC elevated →
  240s poll); TCP health poll after spawn.

### Fixed
- **console.log** in robofang-hub/src/App.tsx removed.
- **llms.txt** now references llms-full.txt.
- **.gitignore** includes `reports/`, `*.mcpb`, `mcpb/`.
- **backend.rs**: Port 10700 hardcoded in format strings replaced with BACKEND_PORT
  constant.

## [1.8.0-alpha.3] — 2026-07-25 "Assess & Fix Refresh"

### Changed
- **CORS**: Added Tauri origins (tauri://localhost, http(s)://tauri.localhost)
  and allow_origin_regex for Tailscale, LAN, and CGNAT IPs in lifecycle.py
  and supervisor.py.
- **Dependencies**: Added prefab-ui>=0.14.0 (fleet SOTA requirement).
- **glama.json**: Version synced to 1.8.0a2.
- **llms-full.txt**: Expanded to full reference (services, tools, prompts,
  connectors, plugins, architecture).
- **Housekeeping**: Removed 28 stale .bak files.

### Fixed
- **Ruff**: Resolved 53 lint errors (E501 line-too-long, S110 try-except-pass,
  S603 subprocess, S310 urlopen, F841 unused vars, E741 ambiguous names).
- **Tauri bundling**: Bundle .env.example instead of .env (security fix).

## [1.8.0-alpha.2] — 2026-04-19 "Industrial Rescue & Security Integrity"

### Added
- **Autonomous Emergency Dispatch (AED)**: Implemented Level 4 environmental response logic (`core/responder.py`) with "Triple-Lock" robot verification (Sensor ➔ POV Snapshot ➔ VLM Analysis).
- **Clean Telephony Bridge**: Integrated with the new modular **Telephony-MCP** (Asterisk/SIP) for high-fidelity, industrial-grade first responder notifications.
- **Sovereign Trinity Protocol**: Adopted the **Ruff + Biome + Semgrep** security toolchain across the repository.
- **Fleet Auditor**: Established `fleet_trinity_audit.py` in MCD to monitor health across 150+ repositories.

### Fixed
- **Installer Security (Critical)**: Remedied a `shell=True` injection vulnerability in the fleet installer (`core/installer.py`) found via Semgrep.
- **Modernized Linting**: Resolved 168+ legacy syntax and type-hinting issues via Ruff.

---

## [1.8.0-alpha.1] — 2026-04-18 "OpenClaw++ Transition"

### Added
- **Embodied Agency**: Established **Noetix Bumi Android** (1m biped) as the primary centerpiece for physical agency.
- **Mission Loop (3-Phase)**: Implemented a robust reasoning pipeline: **Enrich (Foreman)** → **Execute (Labor)** → **Audit (Satisficer)**.
- **Dark Twin Universe (DTU)**: Filesystem shadow proxy for pre-flight change staging (`core/dtu.py`).
- **Bastio Moat**: Integrated HMAC-SHA256 signing for Foreman specifications; plans are now cryptographically verified before execution.
- **Secure Bindings**: Dynamic Tailscale IP detection (`robofang.utils.security`); services now bind to the secure private network by default instead of `0.0.0.0`.
- **Escalation Service**: Programmatic human intervention requests via the new `Escalator` plugin.
- **Observability**: Prometheus metrics (`/metrics`) for real-time fleet health tracking.
- **Ruff Security Audit**: Resolved 100+ security-critical warnings and refactored subprocess calls for absolute path safety.

### Changed
- **Package Management**: Standardized on `uv` for all development and deployment workflows.
- **Architecture**: Refactored `OrchestrationClient` to unify mission processing via the DTU/Bastio pipeline.
- **Documentation**: Overhauled README and technical docs for v1.8.0.

---

## [0.12.6] — 2026-03-29

### Added
- **Ollama Native Tool-Use**: Refactoring the ReAct loop to use Ollama's native `/api/chat` tools API.

---

## [0.2.1] — 2026-02-26

### Added
- **Neural Media RAG Portmanteau** (`tools/RoboFang_rag.py`): Integrated LanceDB semantic search capabilities.

---

## [0.1.0-alpha.1] — 2026-03-13

First alpha release. MCP & robots hub: bridge, supervisor, hub (Vite), fleet installer.
