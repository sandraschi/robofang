# RoboFang expert skill

Expert-level guidance on RoboFang: architecture, Council, fleet, memory, and when to go beyond the operator playbook.

## Architecture in one loop

**Perceive → Reason (Council) → Act (hands/fleet) → Speak → Audit → Memory.**

- **Council of Dozens**: Foreman (spec from intent) → Labor (ReAct tool execution) → Satisficer (audit Forensic Trace). Use `robofang_ask(..., use_council=True)` for synthesis, specs, or high-stakes decisions.
- **Fleet**: MCP servers and connectors (live + config). Use `robofang_fleet` for full map; `robofang_status` for health and counts.
- **Memory**: ADN/memops; reasoning steps in deliberations. Use `robofang_deliberations(limit=N)` to inspect Council/ReAct trace.

## When to use Council vs single-model ask

- **Single ask** (`use_council=False`): Quick Q&A, low stakes, no need for adversarial audit. Default for most chat.
- **Council** (`use_council=True`): Specs, security/design decisions, anything where hallucination or overconfidence matters. Foreman tightens the spec; Satisficer checks Labor’s trace.

## RAG and persona

- **use_rag=True** (default): Orchestrator augments with in-repo RAG when available.
- **persona**: e.g. `sovereign`; sets tone/role in the hub.
- **subject**: Security subject (e.g. `guest`); affects authorization for skills and high-risk actions.

## Troubleshooting via tools

1. **Bridge unreachable**: Check `ROBOFANG_BRIDGE_URL`. Run `robofang_status`; if it fails, start the bridge (`robofang-bridge` or hub start).
2. **Connectors offline**: `robofang_fleet` shows per-connector status; many connectors start on demand or need env/keys.
3. **Understanding a decision**: `robofang_deliberations(limit=20)` then summarize the last entries; Council steps and tool calls appear there.
4. **Multi-step without writing the steps**: Use `robofang_agentic_workflow(goal="...")` and describe the outcome; the LLM plans and runs status/ask/fleet/deliberations and reports back.

## Expert workflows

- **Audit a Council run**: After `robofang_ask(..., use_council=True)`, call `robofang_deliberations(limit=30)` and summarize: Foreman spec → Labor steps → Satisficer verdict.
- **Fleet health + one improvement**: `robofang_agentic_workflow("Summarize fleet status and suggest one concrete improvement")`.
- **Spec then execute**: First `robofang_ask("Draft a short spec for [X]", use_council=True)`; then use that spec in a follow-up ask or agentic_workflow.

## Boundaries

- This MCP server is **thin**: it forwards to the bridge. All state (orchestrator, connectors, memory) lives in the bridge. The hub UI is the main control surface; use these tools for conversation and inspection from Cursor/Antigrav.
- High-risk actions (code exec, file mutation) may require Sentinel approval or sandboxing; the bridge enforces that.

## References

- Operator skill: when to use which tool and Council workflow.
- Repo docs: ARCHITECTURE.md (Council, memory, transport), INSTALLATION.md, MCP_FLEET.md (catalog).
