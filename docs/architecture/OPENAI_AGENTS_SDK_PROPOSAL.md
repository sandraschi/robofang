---
title: "Proposal: OpenAI Agents SDK as RoboFang Council Backbone"
category: architecture
status: proposal
audience: core-dev
related:
  - architecture/AGENTIC_MESH_ARCHITECTURE.md
  - COUNCIL.md
  - COGNITIVE_ARCHITECTURE.md
  - ROADMAP.md
  - standards/AGENT_PROTOCOLS.md
last_updated: 2026-04-24
author: Sandra Schi
---

# Proposal: OpenAI Agents SDK as RoboFang Council Backbone

**Status:** Proposal — awaiting decision  
**Priority:** Phase 3 candidate (Q2 2026)  
**Effort estimate:** 3–5 days for proof of concept; 2–3 weeks for full Council migration  
**Repo:** [openai/openai-agents-python](https://github.com/openai/openai-agents-python) — MIT, ~19k stars, actively maintained by OpenAI  

---

## 1. Executive Summary

RoboFang's Council of Dozens (Foreman → Worker → Satisficer → Adjudicator) is a hand-rolled multi-agent orchestration loop. The OpenAI Agents SDK implements this exact pattern as a mature, provider-agnostic framework with native MCP client support.

This proposal argues for adopting the SDK as the Council's execution backbone, replacing the current `council_orchestrator.py` / `reasoning.py` / `tools/autonomous_council.py` layer, while keeping all FastMCP servers as tool providers — connected via the SDK's native `MCPServerStdio`/`MCPServerSse` client.

The result: the hand-rolled runner loop disappears; Council roles become declarative `Agent` objects with typed handoffs; FastMCP fleet servers attach as MCP tool sources. The agentic mesh architecture described in [AGENTIC_MESH_ARCHITECTURE.md](AGENTIC_MESH_ARCHITECTURE.md) is preserved — only the orchestration substrate changes.

---

## 2. Background: What We Currently Have

The Council is defined in [`COUNCIL.md`](../COUNCIL.md) and implemented across several modules:

```
src/robofang/core/
├── orchestrator.py        # Main mission loop
├── reasoning.py           # Foreman/Worker/Satisficer logic
├── difficulty.py          # DifficultyAssessor
├── escalation.py          # Advocatus Diaboli gate
tools/
├── council_orchestrator.py
├── autonomous_council.py
├── advance_council.py
```

The Council execution sequence (per [`AGENT_PROTOCOLS.md`](../standards/AGENT_PROTOCOLS.md) §2.5):

1. **Phase 1 — Enrich (Foreman):** Transforms raw input into a structured technical spec  
2. **Phase 2 — Execute (Worker):** Performs tool-based work in a ReAct loop  
3. **Phase 3 — Audit (Satisficer):** Adversarial verification against the Foreman's spec  
4. **Adjudicator:** Synthesizes the final response and resolves contradictions

The current implementation drives this with manual LLM calls to Ollama, hand-parsed tool results, and a custom event ring buffer for the `/api/deliberations` SSE feed.

The [`COGNITIVE_ARCHITECTURE.md`](../COGNITIVE_ARCHITECTURE.md) adds the Forensic Trace (internal monologue), Semantic Memory Pool (memops RAG), and the Satisficer "mirror" (self-reflection before mission completion). All of these map directly to SDK concepts.

**Stated Phase 3 goal** (from [`ROADMAP.md`](../ROADMAP.md)):
> "ReAct Loop Migration: Move from regex-based parsing to native Ollama `/api/chat` tool use."

The SDK is exactly this migration.

---

## 3. What the OpenAI Agents SDK Provides

### 3.1 Core Primitives

| SDK Concept | Maps to RoboFang Concept |
|---|---|
| `Agent(instructions=..., tools=[...])` | Council role (Foreman, Worker, Satisficer) |
| `handoff(target_agent)` | Phase transition (Foreman → Worker → Satisficer) |
| `Runner.run(agent, input)` | `orchestrator.py` mission loop |
| `RunResult.new_items` | Forensic Trace / event ring buffer |
| `InputGuardrail` / `OutputGuardrail` | Advocatus Diaboli security gate |
| `MCPServerStdio` / `MCPServerSse` | Bridge to FastMCP fleet servers |
| Tracing backend | `/api/deliberations` SSE feed |

### 3.2 Provider Agnosticism

The SDK is not locked to OpenAI. It supports any OpenAI-compatible endpoint via `model` override:

```python
from agents import Agent, OpenAIChatCompletionsModel
from openai import AsyncOpenAI

# Local Ollama — Qwen3.5 27B
ollama_client = AsyncOpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # ignored by Ollama
)

foreman = Agent(
    name="Foreman",
    model=OpenAIChatCompletionsModel(
        model="qwen3.5:27b",
        openai_client=ollama_client
    ),
    instructions=FOREMAN_SYSTEM_PROMPT
)
```

This means the Tier 1/2/3 LLM routing from [`LLM_RESOURCE_ROUTING.md`](../LLM_RESOURCE_ROUTING.md) is preserved — local models for Workers, Claude Sonnet for hard Foreman specs, etc.

### 3.3 Native MCP Client

This is the most compelling feature for RoboFang specifically. Rather than maintaining bridge HTTP functions per server (as documented in the mesh architecture), the SDK connects to MCP servers directly:

```python
from agents.mcp import MCPServerStdio, MCPServerSse

# Connect to a fleet server via stdio
filesystem_mcp = MCPServerStdio(
    command="uv",
    args=["--directory", r"D:\Dev\repos\filesystem-mcp", "run", "server.py"]
)

# Or via SSE for already-running servers
calibre_mcp = MCPServerSse(url="http://localhost:10720/sse")

async with filesystem_mcp, calibre_mcp:
    worker = Agent(
        name="Worker",
        mcp_servers=[filesystem_mcp, calibre_mcp]
    )
    # SDK auto-discovers all tools from both servers
    # No manual schema registration needed
```

The SDK calls `list_tools()` on startup and injects tool schemas into the agent's context. Tool calls in the model output are automatically dispatched and results fed back. The hand-rolled bridge functions in [`AGENTIC_MESH_ARCHITECTURE.md`](AGENTIC_MESH_ARCHITECTURE.md) become unnecessary for the common case.

### 3.4 Handoffs

Phase transitions become declarative:

```python
from agents import Agent, handoff

satisficer = Agent(
    name="Satisficer",
    instructions=SATISFICER_SYSTEM_PROMPT
)

worker = Agent(
    name="Worker",
    instructions=WORKER_SYSTEM_PROMPT,
    mcp_servers=[filesystem_mcp, memops_mcp],
    handoffs=[handoff(satisficer, tool_name_override="submit_for_audit")]
)

foreman = Agent(
    name="Foreman",
    instructions=FOREMAN_SYSTEM_PROMPT,
    handoffs=[handoff(worker, tool_name_override="assign_to_worker")]
)
```

The Foreman calls `assign_to_worker` when the spec is ready. The Worker calls `submit_for_audit` when execution is complete. The Satisficer returns a result. The SDK runner handles the loop; no manual state machine needed.

### 3.5 Guardrails (Advocatus Diaboli)

The security gate is a natural fit for `OutputGuardrail`:

```python
from agents import Agent, output_guardrail, GuardrailFunctionOutput

@output_guardrail
async def advocatus_diaboli(ctx, agent, output) -> GuardrailFunctionOutput:
    """
    Challenge proposed actions for physical actuation or destructive filesystem ops.
    Returns tripwire if risk detected — mission paused pending human confirmation.
    """
    if _is_high_risk(output):
        return GuardrailFunctionOutput(
            output_info={"risk": "physical_actuation", "requires_human_gate": True},
            tripwire_triggered=True
        )
    return GuardrailFunctionOutput(tripwire_triggered=False)

worker = Agent(
    name="Worker",
    output_guardrails=[advocatus_diaboli],
    ...
)
```

This is cleaner than the current escalation path in `escalation.py` and doesn't require manual injection into the reasoning loop.

### 3.6 Tracing and Forensic Trace

The SDK has a pluggable tracing backend. Every tool call, handoff, model invocation, and guardrail check is traced. The default sends to OpenAI's dashboard — which we don't want — but the backend is swappable:

```python
from agents.tracing import set_trace_processors
from agents.tracing.processors import BatchTraceProcessor

# Custom processor: write to RoboFang's deliberations ring buffer
set_trace_processors([RobofangDeliberationsProcessor()])
```

`RobofangDeliberationsProcessor` would push events to the existing `/api/deliberations` SSE endpoint, preserving the dashboard's Deliberations feed with zero change to the frontend.

---

## 4. Proposed Architecture

### 4.1 Layered Model

```
┌─────────────────────────────────────────────────────────────────┐
│  COUNCIL LAYER  (openai-agents-sdk)                             │
│                                                                 │
│  Foreman Agent  →  Worker Agent  →  Satisficer Agent            │
│       │                │                  │                     │
│  handoff()        handoff()          Result / FAIL+retry        │
│                        │                                        │
│              Advocatus Diaboli (OutputGuardrail)                │
│                   ↕ tripwire on high-risk ops                  │
│                                                                 │
│  Tracing → RobofangDeliberationsProcessor → /api/deliberations │
└──────────────────────────┬──────────────────────────────────────┘
                           │  MCPServerStdio / MCPServerSse
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  TOOL LAYER  (FastMCP 3.2 fleet — unchanged)                    │
│                                                                 │
│  filesystem-mcp   memops    calibre-mcp   robotics-mcp   ...    │
│  (stdio)          (sse)     (sse)         (sse, tier 4)         │
│                                                                 │
│  Tier trust model enforced by which servers are passed to       │
│  which agents (tier 4 / physical = Worker only + guardrail)     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 LLM Routing Preserved

The tier model from `LLM_RESOURCE_ROUTING.md` maps directly:

| Council Role | Recommended Model | Rationale |
|---|---|---|
| Foreman | Claude Sonnet (API) or Qwen3.5 27B Q4 | High-reasoning spec generation |
| Worker | Qwen3.5 27B Q4 (~40 tok/s local) | Tool-heavy execution, latency matters |
| Satisficer | Qwen3.5 35B-A3B MoE (112 tok/s) | Fast adversarial audit |
| Adjudicator | Claude Sonnet (API) | Synthesis of potentially contradictory traces |

Each Agent gets its own `model=` — the SDK is multi-model by design.

### 4.3 MCP Server Attachment Policy

Not every fleet server is available to every agent. The tier trust model from [`AGENTIC_MESH_ARCHITECTURE.md`](AGENTIC_MESH_ARCHITECTURE.md) is enforced by selective attachment:

```python
# Foreman: read-only knowledge only
foreman = Agent(mcp_servers=[memops_readonly, arxiv_mcp])

# Worker: data + inference, no physical actuation
worker = Agent(mcp_servers=[filesystem_mcp, memops_mcp, calibre_mcp, local_llm_mcp])

# Worker with physical gate (separate instance, guarded)
worker_physical = Agent(
    mcp_servers=[robotics_mcp, yahboom_mcp],
    output_guardrails=[advocatus_diaboli]
)
```

Tier 4 / physical actuation servers are only reachable via `worker_physical`, which carries the guardrail. The DifficultyAssessor routes to this instance only when the task explicitly requires it.

---

## 5. Migration Plan

### Phase A — Proof of Concept (3–5 days)

**Goal:** Validate that Council roles work with Ollama + SDK, MCP fleet servers connect cleanly, and the Forensic Trace hooks into `/api/deliberations`.

1. `uv add openai-agents` to `robofang/pyproject.toml`
2. Implement `ForwardingMCPServer` wrapper for existing running fleet servers (SSE connection to already-running ports)
3. Implement three Agent objects matching current Foreman/Worker/Satisficer prompts from `configs/council_advisers.json`
4. Implement `RobofangDeliberationsProcessor` (thin wrapper — pushes SDK trace events to the existing ring buffer)
5. Wire a single test mission end-to-end: filesystem read → write → audit
6. Confirm deliberations dashboard shows the trace

**Success criteria:** A Council round completes via the SDK with identical deliberations output to the current system, on local Ollama, for a file I/O task.

### Phase B — Council Migration (2 weeks)

1. Replace `orchestrator.py` mission loop with `Runner.run()` calls
2. Replace `reasoning.py` role logic with declarative Agent definitions
3. Port `DifficultyAssessor` to a pre-flight check that selects agent configuration
4. Port `escalation.py` Advocatus Diaboli to `OutputGuardrail`
5. Migrate `configs/council_advisers.json` role prompts to Agent `instructions`
6. Deprecate hand-rolled bridge functions — replace with `MCPServerSse` connections to already-running fleet servers
7. Update `tools/council_orchestrator.py` → thin launcher that calls the SDK

### Phase C — Fleet SSE Registry (1 week)

Build a lightweight MCP server registry that maps running fleet ports to `MCPServerSse` instances, keyed by trust tier. The Council layer fetches the registry at startup and attaches appropriate servers to each agent. This replaces the manual bridge function list in the mesh architecture.

---

## 6. What Stays the Same

This is explicitly not a rewrite of RoboFang. The following are unchanged:

- All FastMCP servers — they remain the tool layer, untouched
- The dashboard, frontend pages (Council.tsx, Deliberations.tsx, etc.)
- The `/api/deliberations` SSE endpoint — only the producer changes
- The `Hands` scheduling layer
- The Bastio / DTU security architecture
- The `memops` long-term memory integration
- The Forensic Trace concept — now backed by SDK tracing instead of manual logging
- Port assignments, fleet registry, `WEBAPP_PORTS.md`

---

## 7. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Ollama tool-call reliability with SDK's ReAct loop | Medium | SDK has `max_turns` limit and error recovery; test on Qwen3.5 27B tool-use benchmark before committing |
| SDK tracing defaults to OpenAI dashboard | Certain | Set custom processor on init; no data leaves localhost |
| MCP server connection latency on startup (SSE to 135 servers) | Low | Lazy-connect — attach only servers relevant to the current task tier |
| SDK runner loop doesn't expose enough hooks for Satisficer retry logic | Low | `Runner` supports `on_handoff` callbacks; Satisficer FAIL → re-queue to Worker is a handoff variant |
| `ctx.sample()` (SEP-1577) disappears from FastMCP servers | None | Servers keep their existing sampling; SDK replaces only the Council loop, not server-side sampling |

---

## 8. Dependency Addition

```toml
# pyproject.toml addition
[project.dependencies]
# existing...
openai-agents = ">=0.0.10"
```

`openai-agents` pulls in `openai` (for the API client, used even with Ollama's OpenAI-compat endpoint) and `httpx`. No conflict with existing FastMCP / Starlette stack.

---

## 9. Decision Criteria

**Proceed if:**
- Phase A PoC shows Ollama + SDK produces equivalent Council output in ≤ 2× current latency
- The Forensic Trace integration into deliberations works without frontend changes
- No SDK dependency conflicts with FastMCP 3.2 on the same Python env

**Abort if:**
- Ollama tool-call reliability with the SDK's runner loop is materially worse than the current regex-based path
- SDK tracing cannot be fully contained to local storage
- Phase A takes >1 week (signals deeper incompatibility)

---

## 10. Related Documents

- [Agentic Mesh Architecture](AGENTIC_MESH_ARCHITECTURE.md) — current mesh design; SDK replaces the orchestration layer, not the mesh topology
- [Council of Dozens](../COUNCIL.md) — role definitions, execution sequence
- [Cognitive Architecture](../COGNITIVE_ARCHITECTURE.md) — Forensic Trace, Semantic Memory Pool, Satisficer mirror
- [Agent Protocols](../standards/AGENT_PROTOCOLS.md) — Dark Integration 3-phase flow, trust model
- [LLM Resource Routing](../LLM_RESOURCE_ROUTING.md) — tier-based model assignment
- [Roadmap Phase 3](../ROADMAP.md#phase-3-advanced-reasoning-q2-2026) — ReAct loop migration goal
- [openai-agents-python](https://github.com/openai/openai-agents-python) — upstream SDK
- [openai-agents docs](https://openai.github.io/openai-agents-python/) — official documentation
