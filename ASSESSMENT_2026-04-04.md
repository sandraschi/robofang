# RoboFang: Assessment — 2026-04-04

**Assessed by:** Claude Sonnet 4.6 (full repo read + CHANGELOG since 2026-03-13 + web research)
**Previous assessment:** ASSESSMENT_2026-03-13.md
**Status:** Active Development — Phase 4/5 boundary
**Version:** ~12.6.0 per CHANGELOG / 0.3.0 pyproject (version numbering inconsistency worth fixing)

---

## What Changed Since 2026-03-13

The CHANGELOG shows substantive forward movement since the last assessment:

### Resolved from priority list (2026-03-29 entries)

- ✅ **ReAct loop rewrite initiated** — [12.6.0] documents the Ollama native `/api/chat` tools API refactor as Added. The single highest-impact change from the previous assessment is in progress (confirm implementation is complete vs. in-flight).
- ✅ **Bastio + DefenseClaw integrated** — [12.5.0] security moat layer formalised in `OrchestrationClient`. This closes the gap on the safety pillar.
- ✅ **Connector `.ping()` standard** — bridge `/test` now does real-time liveness. Connector surface is no longer opaque.
- ✅ **Bumi-mcp documented and wired** — ports 10774/10775, fleet-registry.json card, integrations/bumi-mcp.md. Noetix Bumi is now formally in the embodiment roadmap.
- ✅ **Yahboom speech tools** — `robot_speech_say()` and `speech_mcp_tts()` with robot playback. Voice loop on physical hardware is real.
- ✅ **Standards docs updated** — llms.txt/llms-full.txt pair, pre-commit + Ruff, `mcpb pack` packaging. Fleet compliance improved.

### Still open from 2026-03-13 (verify before closing)

- ❓ **`asyncio.get_event_loop()` deprecation** — 5 connectors. Python 3.13 is in the venv. This is a silent bug waiting to blow up.
- ❓ **`python-osc` missing from pyproject.toml** — not mentioned in CHANGELOG.
- ❓ **Prometheus instrumentation endpoint** — no mention of `/metrics` being added.
- ❓ **`MCP_BACKENDS` dict vs federation_map** — deduplication not mentioned.
- ❓ **`dashboard/` vs `robofang-hub/`** — still both present in tree.

---

## Updated Strengths

### ReAct loop is getting fixed at the right level

The Ollama `/api/chat` + native tools refactor eliminates the XML regex problem. What matters now is conversation history management — the previous monolithic prompt growth pattern needs to be replaced with a proper sliding window or summarisation strategy. With Qwen3.5 now available (72.4% SWE-bench, 128K context window, reliable tool-calling per March 2026 ecosystem reports), the RTX 4090 can run the 27B model at usable inference speeds and get genuinely reliable structured tool output. This changes the capability ceiling for local council operations meaningfully.

### Security moat is now architecturally real

Bastio (input validation) + DefenseClaw (action sandboxing) is a coherent two-layer security model. This is more than most orchestration projects at this scale have. The next step is spec signing (Foreman outputs as cryptographically verified artefacts before execution) — which was already on the previous assessment's roadmap.

### Bumi Sim2Real is the right next physical target

The Noetix Bumi is a mid-range educational/research quadruped with documented ROS2 support. Placing it after the virtual embodiment gate (48h Resonite HRI test) is the correct sequencing. The bumi-mcp existence in the fleet confirms this is a planned path, not a vague ambition.

### Yahboom speech loop closes the HRI feedback cycle on physical hardware

Having `robot_speech_say()` on the Yahboom Raspbot means the physical robot can respond verbally in real time during HRI experiments. Combined with the OSC joint control loop in Resonite, robofang now has bidirectional communication channels on both the virtual and physical embodiment layers. This is a real milestone.

### The fleet is maturing in lockstep

135 repos, bumi-mcp + yahboom-mcp + kyutai-mcp (voice pipeline) + lewm-mcp (LeWorldModel/JEPA) all added since March. The LeWM-MCP connection is particularly interesting — LeWorldModel (arXiv:2603.19312) is a JEPA-based world model for embodied agents. Having an MCP adapter for it means council agents can reason over a world model during HRI sessions.

---

## New Weaknesses and Risks (April 2026)

### 🔴 PRIORITY 1: Conversation history in the ReAct loop

The Ollama native tools API is the right transport, but conversation history management is now the binding constraint. Each council session should maintain a typed message list with a maximum context budget. Without this, tool-calling chains longer than ~8 steps will either truncate or grow beyond model context, producing incoherent results. The fix:

```python
MAX_HISTORY_TOKENS = 16000  # leave headroom in 128K context
conversation: list[dict] = [{"role": "system", "content": system_prompt}]

# Each ReAct step
conversation.append({"role": "user", "content": user_message})
response = await ollama.chat(model=model, messages=conversation, tools=tools)
conversation.append(response.message.model_dump())

# Trim if over budget (preserve system + last N pairs)
if estimate_tokens(conversation) > MAX_HISTORY_TOKENS:
    conversation = [conversation[0]] + conversation[-10:]
```

### 🔴 PRIORITY 2: Version number incoherence

The CHANGELOG shows v12.6.0 (semantic — major functional versions) while pyproject.toml shows 0.3.0 (semver for pip packaging). This creates confusion in two contexts: mcpb packaging uses pyproject version, while the CHANGELOG uses a completely different numbering system. Decision required: either synchronise to one version (semver in pyproject, CHANGELOG tracks it), or document explicitly that the two systems are intentionally separate and why.

### 🟡 PRIORITY 3: lewm-mcp integration path is underdocumented

The LeWorldModel MCP server exists (port 10927/10928) but there's no documentation of how council agents use it, what the expected data flow is, or what the JEPA world model outputs mean in the context of HRI planning. This is one of the most technically interesting pieces in the fleet and deserves a proper integration doc before the connection becomes load-bearing.

### 🟡 PRIORITY 4: Qwen3.5 is the right council model now

The previous assessment recommended Llama 3.3 70B (4-bit, ~24GB) as the primary council model. As of March/April 2026, **Qwen3.5 27B** is the better choice for tool-calling reliability and SWE-bench performance at the same VRAM budget. The `local-llm-mcp` model routing config should be updated:

```json
// llm_model_tiers.json — suggested update
{
  "council_reasoning": "qwen3.5:27b",
  "fast_drafts": "qwen3.5:9b",
  "multimodal": "cloud:gemini-2.0-flash",
  "code_only": "qwen3-coder-next:9b"
}
```

The Qwen3.5 35B-A3B MoE model (3B active params, 112 t/s on RTX 3090) is also worth evaluating for the Satisficer role where speed matters more than depth.

### 🟡 PRIORITY 5: `asyncio.get_event_loop()` is now a hard error risk

Python 3.13 is confirmed in the venv (`python.exe` present). Python 3.12+ issues a DeprecationWarning; Python 3.14 will error. The five affected connectors (Email, Hue, Ring, Plex, Calibre) should be patched before they silently fail in a council session. This is a 10-minute fix per connector.

### 🟡 PRIORITY 6: No structured test for the Council end-to-end

`tests/test_agentic_workflow.py` exists but the council path (Foreman → Labor → Satisficer → Adjudicator) has no integration test. A council round-trip against a local Ollama mock would catch regressions in the tool bridge, conversation history, and adjudication logic. The benchmark data in `data/benchmarks/` proves the council has been used, but manual benchmarks don't prevent regressions.

### 🟢 LOWER: Memory directory is empty

`memory/` exists but is empty. If `memops` (advanced-memory-mcp) is the knowledge graph substrate, the connection between council session outputs and the memory graph needs to be documented and verified. The PRD says every significant decision gets written to memops — confirm this is wired in orchestrator and not just aspirational.

### 🟢 LOWER: Fleet manifest duplication

`fleet_manifest.yaml` + `configs/federation_map.json` + `src/robofang/configs/fleet-registry.json` — three files serving overlapping purposes. Before adding more servers to the federation, a clear ownership model for each is needed.

---

## Competitive Landscape Update (April 2026)

**OpenFang** (RightNow AI): Still shipping at high velocity. The March/April 2026 picture is that it has consolidated its position as the general-purpose multi-channel agent framework in Rust. Its A2A protocol support and 40 channel adapters make it the clear winner for "I want to connect everything to an LLM." What it still doesn't have: embodiment, local-first inference strategy, or the custom fleet depth that robofang carries.

**Cursor/Windsurf with MCP**: The IDE-native agent pattern has gotten significantly better. The implication for robofang is that the `robofang-mcp` adapter needs to be polished — because Cursor/Windsurf users can now get a lot done without a separate orchestration hub. Robofang's value proposition to IDE users needs to be the **council and embodiment layers**, not basic tool-calling.

**LeWorldModel (JEPA, arXiv:2603.19312)**: This is the most interesting new entrant in robofang's technical domain. A JEPA-based world model for embodied agents, with a FastMCP adapter already in the fleet. The opportunity is to wire LeWM into the Simulation Layer so council planning uses a learned world model rather than pure LLM priors. This would be genuinely differentiated from anything in the ecosystem.

**Qwen3.5 / local model landscape**: As noted in Priority 4, the local model ceiling has risen significantly. A 27B model with reliable tool-calling and 128K context means the local council is no longer inherently inferior to cloud — it's a credible first-class path for structured reasoning, not a fallback.

---

## Positioning (Unchanged Core, Updated Framing)

The 2026-03-13 positioning holds and strengthens:

> **Sovereign orchestration hub for local AI + physical and virtual embodiment on custom hardware, with a domain-specific MCP fleet and an adversarial Council that no general-purpose framework replicates.**

The new elements to add to public positioning:
- LeWorldModel integration: **planning grounded in a learned world model, not just LLM priors**
- Qwen3.5 council: **frontier-class local reasoning at zero per-token cost**
- Bumi Sim2Real: **virtual-validated physical embodiment, not hardware-first robotics**

---

## Prioritised Action List (April 2026)

### Fix now (blocking reliability)

1. **Confirm `reasoning.py` ReAct rewrite is complete** — `[12.6.0]` says "Added: Ollama Native Tool-Use: Refactoring..." which reads as in-progress. Verify the refactor is actually shipping and not just documented. Add conversation history management with token budget.

2. **`src/robofang/core/connectors.py`** — replace `asyncio.get_event_loop()` in 5 connectors.

3. **`pyproject.toml`** — add `python-osc>=1.8` if still missing.

### Ship soon (quality and coherence)

4. **`configs/llm_model_tiers.json`** — update primary council model from Llama 3.3 70B to Qwen3.5 27B. Document tier rationale.

5. **`docs/integrations/lewm-mcp.md`** — write the LeWorldModel integration doc: what it outputs, how council agents use it for embodied planning, what the data flow looks like from Resonite → lewm → council plan → OSC actuator.

6. **Version unification** — decide on pyproject as canonical. Align CHANGELOG numbering or document the dual-system deliberately.

7. **`tests/test_council_e2e.py`** — minimal end-to-end council test against a local Ollama mock. Catches regressions before they hit production.

8. **`memory/` wiring** — confirm `memops` writes are in orchestrator, or add them. The knowledge graph substrate should be capturing every council session.

### Structural

9. **Fleet manifest ownership** — document which of the three manifest files is authoritative for which purposes and stop writing to the others.

10. **`robofang-mcp` polish** — the MCP adapter for Cursor/Windsurf needs to be the front door for IDE-native users. Clean up, document, and register it properly so it's usable without reading the internals.

11. **Prometheus endpoint** — still missing. One line: `Instrumentator().instrument(app).expose(app)`. Connects the whole monitoring stack.

---

## What Is Working Well (Stable)

- Federation map + MCPBridgeConnector pattern: correct and elegant
- Three-process topology (Dashboard/Bridge/Supervisor): stable
- Council of Dozens: differentiated, no competitor has it
- Virtual-First Policy: correct engineering discipline
- FastMCP 3.1 unified gateway with `ctx.sample()` agentic pattern
- SOUL/HEART/BODY template system for persona synthesis
- `_RingHandler` in-memory log buffer
- Physical robotics pipeline (Yahboom + speech + OSC)
- The embodiment roadmap: virtual → Bumi → Unitree sequencing is sound

---

*Assessment written 2026-04-04. Previous: ASSESSMENT_2026-03-13.md.*
