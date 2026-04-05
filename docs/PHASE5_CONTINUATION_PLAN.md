# RoboFang: Phase 5 Continuation Plan
# 2026-04-04

**Scope**: Phase 5 (April–June 2026) — Embodiment + World Models
**Input**: Assessment 2026-04-04 + PRD_v2.md
**Format**: Ordered task list, grouped by work stream, each task is independently completable in a Cursor session

---

## Work Stream A: ReAct Loop Hardening (Highest Impact)

**Context**: `[12.6.0]` initiated the Ollama native tool-use refactor. The CHANGELOG says "Added: Refactoring..." which may mean in-progress. Before anything else, confirm the state of `src/robofang/core/reasoning.py`.

### A1 — Verify and Complete the Native Tool-Use Rewrite

**File**: `src/robofang/core/reasoning.py`

Confirm `reason_and_act()` uses:
```python
response = await ollama.chat(
    model=model,
    messages=conversation_history,
    tools=tool_definitions,  # proper JSON schema
)
tool_calls = response.message.tool_calls  # typed list, no regex
```

If still on `/api/generate` + XML regex, complete the rewrite now. This is the single most reliability-impacting change in the codebase.

**Done when**: `test_bridge_import.py` passes + manual council session completes 5 tool-call chain without regex failure.

### A2 — Add Conversation History with Token Budget

**File**: `src/robofang/core/reasoning.py` (or new `src/robofang/core/conversation.py`)

Add `ConversationManager` class as specified in PRD_v2 §4.1. Wire into `reason_and_act()`. Set `MAX_HISTORY_TOKENS = 16000` as default (configurable from federation_map or env).

**Done when**: A 15-step council Labor loop completes without context window error on Qwen3.5 27B.

### A3 — Update Primary Council Model to Qwen3.5

**File**: `configs/llm_model_tiers.json` (create if not present), `src/robofang/core/reasoning.py`, orchestrator model selection

Update model tiers per PRD_v2 §2.V. Document why Qwen3.5 27B over Llama 3.3 70B (reliability, VRAM headroom, 128K context).

**Done when**: Orchestrator routes council reasoning to `qwen3.5:27b` by default, with env override documented.

---

## Work Stream B: Bug Fixes (Quick Wins)

### B1 — asyncio.get_event_loop() patch

**Files**: `src/robofang/core/connectors.py` — EmailConnector, HueConnector, RingConnector, PlexConnector, CalibreConnector

Replace all `asyncio.get_event_loop().run_until_complete(...)` with `asyncio.run(...)` or restructure sync wrappers to use `asyncio.to_thread()`. Python 3.13 is in the venv; this will break silently.

**Time estimate**: 30 minutes.

### B2 — python-osc dependency declaration

**File**: `pyproject.toml`

Add `"python-osc>=1.8"` to dependencies if missing. Verify by running `python -c "import pythonosc"` in the venv.

**Time estimate**: 5 minutes.

### B3 — Prometheus instrumentation

**File**: `src/robofang/main.py`

```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
```

Add `"prometheus-fastapi-instrumentator"` to pyproject.toml. This connects the Docker Compose monitoring stack to live application data.

**Time estimate**: 10 minutes + confirming Grafana dashboard picks it up.

---

## Work Stream C: Council Architecture (Phase 5 Core)

### C1 — Per-Role Council Prompts

**Files**: Create `configs/council_roles/` directory with:
- `foreman.md` — architectural planning, spec structure requirements
- `labor.md` — tool-use execution, ReAct discipline
- `satisficer.md` — adversarial audit criteria
- `adjudicator.md` — synthesis from disagreement
- `instigator.md` — red-team failure mode surfacing (new role)
- `architect.md` — structural coherence validation (new role)

Update orchestrator to load role-specific prompt at session start.

**Done when**: A council session logs which prompt each member used in the deliberations feed.

### C2 — Connector Capability Schema

**File**: `src/robofang/core/connectors.py` (BaseConnector ABC)

Add `get_capabilities() -> list[dict]` abstract method. Implement minimal JSON schema for each connector:
```python
def get_capabilities(self) -> list[dict]:
    return [{
        "name": "plex_search",
        "description": "Search Plex media library",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "media_type": {"type": "string", "enum": ["movie", "show", "music"]}
            },
            "required": ["query"]
        }
    }]
```

Wire `_build_tool_bridge()` in orchestrator to include schemas in Ollama tools parameter.

**Done when**: A council session can call `connector_plex` with correct parameters without the LLM guessing.

### C3 — Foreman Spec Signing (HMAC)

**Files**: `src/robofang/core/orchestrator.py`, `src/robofang/core/connectors.py` (Bastio integration)

Implement HMAC spec signing as specified in PRD_v2 §4.3. Store signing secret in `.env`. Bastio verifies signature before passing plan to Labor. This is the minimum viable spec integrity check.

**Done when**: Bastio rejects an unsigned spec in a test scenario.

### C4 — End-to-End Council Integration Test

**File**: `tests/test_council_e2e.py`

Minimal council round-trip test against a local Ollama mock (or real Ollama with a lightweight model like Qwen3.5 9B). Test:
1. Orchestrator receives task
2. Foreman produces signed spec
3. Labor executes 2-step tool chain
4. Satisficer audits
5. Result returned to caller

**Done when**: `pytest tests/test_council_e2e.py` passes in CI.

---

## Work Stream D: Knowledge Graph Integration

### D1 — Memops Council Session Writes

**File**: `src/robofang/core/orchestrator.py`

Every council session writes to advanced-memory-mcp (memops) via the existing tool bridge or direct HTTP call. Write:
- Session start: task, model selection, tool bridge schema snapshot
- Each Labor step: tool call + result + latency
- Session end: Satisficer score, final output summary

This builds the longitudinal dataset for sentience validation metrics.

**Done when**: A council session produces a readable note in memops with full forensic trace.

### D2 — Deliberations Feed → Memops Search

**File**: `robofang-hub/src/pages/` (dashboard) + bridge API

Add a search endpoint over past deliberations backed by memops semantic search. Expose in the hub as "Search past sessions."

**Done when**: Searching "patrol" in the hub surfaces the Yahboom patrol council sessions.

---

## Work Stream E: LeWorldModel Integration

### E1 — Integration Documentation

**File**: `docs/integrations/lewm-mcp.md`

Document:
- What lewm-mcp outputs (world state embeddings, forward predictions)
- How council agents call it (`lewm_predict(state, actions) -> predicted_state`)
- The data flow: Resonite observation → lewm state update → Foreman planning query
- What "grounded planning" means in practice vs. pure LLM priors

This is prerequisite to any code integration — the concept needs to be precisely specified first.

### E2 — Prototype Planning Integration

**File**: `src/robofang/core/orchestrator.py` or new `src/robofang/core/world_model.py`

Wire lewm-mcp as an optional planning tool for the Foreman. When `USE_WORLD_MODEL=true`, Foreman gets access to `lewm_predict()` in its tool set and is prompted to evaluate candidate plans before committing.

**Done when**: A Foreman session log shows a lewm_predict call and a revised plan in response.

---

## Work Stream F: Structural Cleanup

### F1 — Fleet Manifest Ownership

**File**: `docs/FLEET_MANIFEST_OWNERSHIP.md` (new)

Document which file is authoritative for which purpose:
- `fleet_manifest.yaml` — human-readable fleet overview (no machine reads this)
- `configs/federation_map.json` — authoritative connector topology (bridge reads this)
- `src/robofang/configs/fleet-registry.json` — installer catalog (hub reads this)

Add a check in CI that flags if the same server is defined differently in all three.

### F2 — MCP_BACKENDS dict → federation_map derivation

**File**: `src/robofang/main.py`

Replace hardcoded `MCP_BACKENDS` dict with code that derives it from `configs/federation_map.json` at startup. Keep env override pattern. This means adding a new MCP server is a single edit in federation_map, not a code change.

### F3 — Archive `dashboard/` directory

The old `dashboard/` (Vite app) is superseded by `robofang-hub/`. Either:
- Move to `archive/dashboard_old/` with a README explaining it's superseded
- Delete entirely (confirm nothing imports from it)

Halves frontend maintenance surface.

### F4 — Version Number Unification

Decide: pyproject.toml version (0.3.x) is canonical for pip packaging. CHANGELOG uses a different numbering (12.6.0) for user-visible milestones. Document this explicitly in CONTRIBUTING.md or synchronise to one system. The current ambiguity causes confusion when publishing to glama.ai.

---

## Work Stream G: robofang-mcp Polish

### G1 — Verify robofang-mcp is functional

**Directory**: `robofang-mcp/`

Confirm that:
- `robofang-mcp` entry point starts a FastMCP server
- Tools (`robofang_ask`, `robofang_fleet_status`, `robofang_council`, `robofang_deliberations`) call the bridge correctly
- Cursor/Claude Desktop can connect to it via stdio or SSE

### G2 — Register in claude_desktop_config.json

Add `robofang-mcp` to Claude Desktop config so it's the front door for Claude → robofang interactions. Document the setup in a QUICKSTART.md.

---

## Feasibility Assessment

### What's straightforward (days, not weeks)

- B1–B3 bug fixes: 1 day
- A1 ReAct verify/complete: 1–2 days depending on actual state
- A2 conversation history: 1 day
- A3 model tier update: half a day
- F1–F4 structural cleanup: 1 day
- E1 lewm integration doc: 1 day
- C4 council e2e test: 1–2 days

### What needs more thought (week-range)

- C1 per-role prompts: writing good prompts is iterative — 1 week of tuning after initial implementation
- C2 connector capability schemas: 13 connectors × schema definition + wiring = 2–3 days
- D1 memops council writes: implementation is simple, but getting the schema right takes iteration — 3–4 days
- E2 lewm prototype planning integration: depends on lewm-mcp API stability — 3–5 days

### What has real risk

- **C3 Foreman spec signing**: HMAC is straightforward, but integrating with Bastio's enforcement mode without breaking existing sessions requires careful staging. Do in dev environment, test with disable mode first.
- **E2 LeWorldModel integration**: lewm-mcp is relatively new (arXiv:2603.19312, early 2026). The API may not be stable. The integration should be flagged as experimental and gated by `USE_WORLD_MODEL=false` default.

### What's not in scope for Phase 5

- Bumi physical hardware (Virtual-First gate applies — needs 48h Resonite HRI first)
- Unitree G1 (long-term horizon)
- Ed25519 spec signing (HMAC first, Ed25519 in Phase 6)
- iOS companion app (documented in docs/apple/, Phase 6 target)

---

## Suggested Session Order for Cursor

1. **Session 1**: B1 + B2 + B3 (bugs, one hour, clear wins)
2. **Session 2**: A1 verify + complete if needed (highest impact)
3. **Session 3**: A2 conversation history + A3 model tiers
4. **Session 4**: C2 connector capability schemas (enables reliable council tool-calling)
5. **Session 5**: C4 council e2e test (validate that A1–A3 + C2 work together)
6. **Session 6**: D1 memops council writes
7. **Session 7**: C1 per-role prompts (iterative — expect multiple sessions)
8. **Session 8**: F1–F4 structural cleanup
9. **Session 9**: E1 lewm doc + E2 prototype
10. **Session 10**: G1–G2 robofang-mcp polish

---

*Plan written 2026-04-04. Companion documents: ASSESSMENT_2026-04-04.md, PRD_v2.md.*
