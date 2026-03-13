# RoboFang operator skill

When to use which tool and how to combine them with the Council workflow.

## Tools

- **robofang_status** — Call first to confirm the bridge is up. Use **sections='all'** to inspect activity, scheduling, config, hands, and council personas.
- **robofang_help** — Multi-level: **depth** 0|1|2|3|full, **path** e.g. `'council.use_council'` for direct topic.
- **robofang_ask(message, use_council=False, use_rag=True)** — Single question to the hub. Set `use_council=True` for Council of Dozens (Enrich → Execute → Audit).
- **robofang_fleet** — Full fleet: connectors (live + config), domain agents, summary.
- **robofang_deliberations(limit=50)** — Recent reasoning log (Council/ReAct steps).
- **robofang_agentic_workflow(goal)** — Describe a high-level goal in natural language; the LLM plans and runs status/ask/fleet/deliberations as needed and summarizes.
- **Agentic tasks**: robofang_task_list, robofang_task_get, robofang_task_create_from_phrase, **robofang_task_run_from_phrase(phrase)** (start from natural language and report back), robofang_task_run(id), robofang_task_update, robofang_task_delete.

## Workflows

1. **Quick check**: `robofang_status` → then `robofang_ask("one sentence question")`.
2. **Council synthesis**: `robofang_ask("Your prompt", use_council=True)`.
3. **Multi-step goal**: `robofang_agentic_workflow("Summarize fleet status and suggest one improvement")`.
4. **Start patrol and report**: `robofang_task_run_from_phrase("yahboom robot patrol and report back anomalies")` — for "RoboFang, start yahboom robot patrol and report back anomalies".

## Connection

Set `ROBOFANG_BRIDGE_URL` if the bridge is not at `http://localhost:10871`. This server (robofang-mcp) forwards all calls to the bridge.
