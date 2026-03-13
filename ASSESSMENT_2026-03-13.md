# RoboFang: Assessment — 2026-03-13

**Assessed by:** Claude Sonnet 4.6 (full repo read + competitive landscape web search)
**Previous assessment:** ASSESSMENT.md (2026-03-10)
**Status:** Active Development — Phase 4 per PRD
**Version:** 0.3.0 (pyproject) / 2.1.0 (CHANGELOG)

---

## What Changed Since 2026-03-10

The `[Unreleased] — 2026-03-12` CHANGELOG entries show real progress since the last assessment:

- ✅ **CORS fix confirmed** — `http://localhost:10864` and `http://127.0.0.1:10864` now in `allow_origins` in `main.py`. The Priority 1 blocker from the last assessment is resolved.
- ✅ **Single-command launch** — `start_all.ps1` brings up supervisor (10872), bridge (10871), and hub (10870) cleanly.
- ✅ **Install→Register→Launch flow** — after catalog install, connector auto-registers in topology and launches once.
- ✅ **Fleet status cards** — connector cards show server status and webapp launch buttons.
- ✅ **New bridge API endpoints** — `/api/connectors/{id}/status`, `/api/fleet/installer-catalog`, `/api/fleet/register`, `/api/connector/launch/{id}`.
- ✅ **Test coverage added** — `tests/conftest.py`, `tests/test_bridge_fleet.py`, `docs/TESTING.md`.
- ✅ **`scripts/backup-repo.ps1`** added.

---

## Strengths

### Architecture is sound
The three-process topology (Dashboard → Bridge → Supervisor), `MCPBridgeConnector` pattern, federation map as single source of truth, and `FastMCP.from_fastapi()` unified gateway are all correct decisions for a Windows-native MCP platform at this scale. Not cargo-culted — shows understanding of the tradeoffs.

### Connector surface is unusually deep for a solo project
Thirteen real connectors (not stubs) with real library integration: `python-kasa`, `ring_doorbell`, `phue`, `plexapi`, `calibredb` subprocess, `discord.py` async, ResoniteLink WebSocket. At 64KB, `connectors.py` is larger than most complete MCP servers. The `MCPBridgeConnector` design — one class to bridge any FastMCP HTTP server with optional sidecar auto-start — is architecturally elegant.

### Council of Dozens is the most differentiated feature
12-adjudicator debate with role specialization, embodied council members (Resonite vbots via OSC), cloud tiebreaker on split votes, and a full audit trail in `exchange/synthesized/`. The benchmark data in `data/benchmarks/` confirms actual usage. No comparable project does this.

### Virtual-first embodiment research is unique in the space
Resonite/OSC/ProtoFlux pipeline for HRI validation before physical hardware deployment. The 48-hour adversarial HRI policy before any hardware purchase is the right engineering discipline. No competitor has this.

### FastMCP 3.1 ahead of fleet SOTA
Fleet standard is `fastmcp>=3.0.0`; robofang specifies `>=3.1.0`. The `from_fastapi()` unified gateway is the correct current pattern.

### `robofang_agentic_workflow` with `ctx.sample()` is the right MCP abstraction
Exposes the hub as a meta-tool to Claude/Cursor with proper sampling, letting the LLM plan and execute multi-step goals without the client needing to know internal structure. Most MCP servers don't do this.

---

## Weaknesses and Implementation Gaps

### 🔴 PRIORITY 1: ReAct loop is fragile at any model size

`reasoning.py` uses `/api/generate` with XML `<call name='...'>` parsing via regex. Problems:
- No conversation history (each step re-sends full context as a monolithic prompt — unbounded growth)
- Regex XML parsing fails on edge cases all models produce (especially Llama/Qwen at 7B)
- No structured output enforcement

**Fix:** Switch to Ollama `/api/chat` with the `tools` parameter (native tool_use, supported since Ollama 0.3). This makes the ReAct loop model-agnostic and reliable at 7B. This is the highest-impact single change in the codebase.

```python
# Current (fragile)
response = await ollama.generate(model=model, prompt=full_prompt_string)
# parse XML from response.response with regex

# Target (reliable)
response = await ollama.chat(
    model=model,
    messages=conversation_history,
    tools=tool_definitions,  # proper JSON schema
)
# response.message.tool_calls is a typed list, no regex
```

### 🔴 PRIORITY 2: Connector capability schema missing

When the orchestrator builds the tool list for the ReAct LLM, connectors appear as opaque `connector_plex`, `connector_calibre` entries with no schema. The LLM cannot meaningfully call connectors without knowing parameters. Unlocking this requires:

```python
class BaseConnector(ABC):
    @abstractmethod
    def get_capabilities(self) -> dict:
        """Return JSON schema for this connector's tools."""
        ...
```

Each concrete connector implements it, and `_build_tool_bridge()` in the orchestrator passes schemas to the ReAct tool list. Without this, the multi-agent Council cannot dispatch to fleet connectors effectively.

### 🟡 PRIORITY 3: `python-osc` missing from `pyproject.toml`

`autonomous_council.py` → `osc_council_bridge.py` requires `python-osc` but it's not declared. The Resonite council path will fail with a silent ImportError at runtime. One-line fix:

```toml
# pyproject.toml
"python-osc>=1.8",
```

### 🟡 PRIORITY 4: `asyncio.get_event_loop()` deprecated (Python 3.12+)

Affects: `EmailConnector`, `HueConnector`, `RingConnector`, `PlexConnector`, `CalibreConnector` in `connectors.py`. Python 3.12 raises `DeprecationWarning`; future versions will error. Replace all instances:

```python
# Current
loop = asyncio.get_event_loop()
loop.run_until_complete(...)

# Fix
asyncio.get_running_loop().run_until_complete(...)
# or restructure to use asyncio.to_thread() for sync calls
```

### 🟡 PRIORITY 5: Monitoring stack disconnected from application

Prometheus/Grafana/Loki Docker Compose is configured but the bridge has no `/metrics` endpoint. Fix is one line:

```python
# main.py, after creating app
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
```

Add `prometheus-fastapi-instrumentator` to `pyproject.toml`. This connects the entire monitoring stack to live application data.

### 🟡 PRIORITY 6: Runtime artifacts committed to git

Update `.gitignore`:
```
exchange/sandbox/*/
sessions/*.json
data/*.db
data/benchmarks/
robofang_test.db
grafana-data/
prometheus-data/
memory/
*.backup
*.bak
```

### 🟢 LOWER: Duplicate dashboards

Both `dashboard/` and `robofang-hub/` exist with separate `node_modules` and `dist/`. `robofang-hub` is the live one. The older `dashboard/` should be archived or deleted to halve frontend maintenance surface.

### 🟢 LOWER: `MCP_BACKENDS` dict duplicates `federation_map.json`

The 30+ entry dict in `main.py` duplicates data from `configs/federation_map.json`. `_backend_url_for_connector()` already does the right thing (topology first, MCP_BACKENDS as fallback). Derive the dict at startup from config rather than maintaining it manually.

### 🟢 LOWER: `ROBOFANG_AUTO_LAUNCH_CONNECTORS` is invisible to users

The env var that enables fleet auto-launch isn't surfaced in the dashboard settings UI. A new installer who doesn't know about it will be confused when connectors don't start. Add a toggle to the hub settings page.

---

## Competitive Landscape — OpenFang Reality Check

The README positions robofang as the "OpenFang alternative." The actual state of OpenFang has changed dramatically.

**OpenFang as of 2026-03-12 (v0.3.49):**
- 15-crate Rust workspace, single ~32MB binary, <200ms cold start
- 53 native tools + MCP client/server + A2A protocol
- 40 channel adapters (Telegram, Discord, Slack, WhatsApp, Teams, IRC, Matrix, LINE, and 33 more)
- 60 bundled skills, FangHub marketplace
- 7 autonomous Hands with HAND.toml parser
- WASM dual-metered sandbox + 16 security layers + Merkle audit trail + Ed25519 manifest signing
- Tauri 2.0 native desktop app
- 9,023 GitHub stars and 943 forks, 15 days after first public release
- Shipping multiple releases per day, active community (560+ issues)

**Honest feature comparison:**

| Dimension | Robofang | OpenFang |
|-----------|----------|----------|
| Language | Python | Rust |
| Install | pip + npm build | Single binary |
| Cold start | ~8s (8s startup delay in main.py) | <200ms |
| Agent sandbox | None | WASM dual-metered |
| Channel adapters | 13 connectors | 40 adapters |
| Multi-agent | Council of Dozens (adversarial) | Workflow fan-out |
| Security | ApprovalGate for sensitive tools | 16 layers, Merkle, Ed25519 |
| Desktop | React SPA (browser) | Tauri 2.0 native |
| Memory | LanceDB RAG (local) | SQLite + vector embeddings |
| **Virtual embodiment** | **Resonite/OSC/ROS2 ✅** | None ❌ |
| **Local inference** | **RTX 4090/Ollama first-class ✅** | Cloud-first |
| **Physical robotics** | Architecture + roadmap ✅ | Not present |
| **Windows-native** | Core target ✅ | Linux primary |
| **Custom fleet** | 20+ domain-specific MCP servers ✅ | General-purpose |

**Where robofang wins and should lean in:**

1. **Virtual + physical embodiment** — Resonite/OSC/ProtoFlux + ROS2 + Yahboom/Noetix Bumi roadmap. OpenFang has no answer.
2. **Local inference sovereignty** — Ollama/RTX 4090 as the primary path, cloud as fallback. OpenFang is cloud-first.
3. **Custom Sandra-class fleet** — 20+ bespoke MCP servers with robofang.json integration metadata. OpenFang's general architecture can't replicate this.
4. **Adversarial Council synthesis** — OpenFang has workflow fan-out but not the debate/tiebreaker/audit-trail pattern.
5. **Windows-native** — PowerShell launch scripts, Windows Sandbox, pywinauto desktop automation. OpenFang's primary target is Linux.

**The positioning problem:**

"OpenFang alternative" framing doesn't work anymore. OpenFang is now shipping v0.3.49 with 9k stars the day before this assessment. But more fundamentally, framing robofang against an "agent OS" is accepting a false premise — OpenFang isn't an OS, it's OpenClaw in Rust with a better security model and a CLI. Robofang doesn't need to compete with that at all.

Robofang's actual positioning:

> **Sovereign orchestration hub for local AI + physical and virtual embodiment on custom hardware, with a domain-specific MCP fleet that no general-purpose orchestration framework can replicate.**

That's differentiated, true, and not a fight measured by features-per-line-count.

**On OpenFang's actual category:** Despite the "Agent OS" branding, OpenFang is OpenClaw++ — a well-engineered orchestration framework with a Rust rewrite, better security, and a CLI. "Agent OS" implies kernel-level resource management, process scheduling, and memory isolation. None of these projects do that. It's marketing copy. Robofang should not use the OS framing or position itself against it.

**On OpenFang's trajectory:** Single-founder project (Jaber at RightNow AI) shipping at extraordinary velocity. The acquisition playbook is clear — same pattern as OpenClaw, Moltbook, Steipete's Shuttle, Matt Schlicht's Chatflow. Whether it stays independent or gets acquired by a megacorp (likely within 12 months at this star velocity), robofang's moat is the embodiment layer, the local sovereignty architecture, and the custom fleet. A Microsoft or Databricks acquisition of OpenFang makes the "sovereign" niche *more* valuable, not less.

---

## Prioritised Action List for Cursor

### Fix now (blocking quality)

1. **`src/robofang/core/reasoning.py`** — Switch `reason_and_act()` from `/api/generate` + XML regex to `/api/chat` + Ollama native `tools` parameter. This is the single most impactful change.

2. **`pyproject.toml`** — Add `python-osc>=1.8` to dependencies.

3. **`src/robofang/core/connectors.py`** — Replace `asyncio.get_event_loop()` with `asyncio.get_running_loop()` in `EmailConnector`, `HueConnector`, `RingConnector`, `PlexConnector`, `CalibreConnector`.

### Fix soon (quality of life)

4. **`src/robofang/core/connectors.py`** — Add `get_capabilities() -> dict` to `BaseConnector` ABC. Implement minimal schemas for each connector. Wire into `_build_tool_bridge()` in orchestrator.

5. **`src/robofang/main.py`** — Add Prometheus instrumentation endpoint.

6. **`.gitignore`** — Add runtime artifact exclusions listed above.

7. **`src/robofang/main.py`** — Derive `MCP_BACKENDS` from `configs/federation_map.json` at startup instead of hardcoded dict.

### Structural

8. **`dashboard/`** — Archive or delete. `robofang-hub/` is the live dashboard.

9. **`README.md`** — Reframe positioning: remove "OpenFang alternative," lead with embodiment + sovereignty + custom fleet.

10. **Hub settings page** — Surface `ROBOFANG_AUTO_LAUNCH_CONNECTORS` as a toggle.

---

## What Is Working Well (unchanged from 2026-03-10)

- Federation map design is clean and extensible
- `MCPBridgeConnector` pattern is elegant and correct
- Supervisor architecture (BridgeProcess + FleetHealthMonitor + SkillsWatcher) is the right design
- FastMCP 3.1 unified gateway
- Council tiebreaker-to-cloud pattern
- `_RingHandler` in-memory log buffer with `/logs` polling
- Virtual-First Policy as engineering discipline
- Templates system (SOUL/HEART/BODY) for persona synthesis
- `robofang_agentic_workflow` with `ctx.sample()` as the correct MCP meta-tool pattern

---

*Assessment written 2026-03-13. Previous: ASSESSMENT.md (2026-03-10).*
