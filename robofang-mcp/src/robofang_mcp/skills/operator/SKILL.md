# RoboFang operator skill

**Description:** Multi-agent council orchestration for RoboFang — an MCP bridge that coordinates robot fleet operations, agentic task execution, and synthetic council debates. Covers fleet status, task management, council deliberation, MCP bridge commands, and VR visualization integration.

## Trigger Phrases

- "What's the fleet status?"
- "Ask the council about [problem]"
- "Start a patrol task on [robot]"
- "Show recent deliberations"
- "Summarize fleet health and suggest improvements"
- "Create a task to [action]"
- "What connectors are active?"

## Tools

- **`robofang_status(sections='all')`** — Call first to confirm bridge is up. Inspect activity, scheduling, config, hands, and council personas.
- **`robofang_help(depth=0, path='...')`** — Multi-level help: depth 0|1|2|3|full. Path e.g. `'council.use_council'` for direct topic drill-down.
- **`robofang_ask(message, use_council=False, use_rag=True)`** — Single question to the hub. Set `use_council=True` for Council of Dozens (Enrich → Execute → Audit).
- **`robofang_fleet()`** — Full fleet inventory: connectors (live + config), domain agents, summary stats.
- **`robofang_deliberations(limit=50)`** — Recent reasoning log from Council/ReAct steps. Review for decision traceability.
- **`robofang_agentic_workflow(goal)`** — High-level goal in natural language. LLM plans and executes status/ask/fleet/deliberations as needed, returns summary.
- **`robofang_task_list()`** — List all tasks with status.
- **`robofang_task_get(task_id)`** — Get task details and history.
- **`robofang_task_create_from_phrase(phrase)`** — Create task from natural language.
- **`robofang_task_run_from_phrase(phrase)`** — Start execution from natural language and report back.
- **`robofang_task_run(id)`** — Execute a previously created task by ID.
- **`robofang_task_update(id, ...)`** — Modify task parameters or status.
- **`robofang_task_delete(id)`** — Remove a task.

## Workflows

1. **Quick check**: `robofang_status(sections='all')` → `robofang_ask("one sentence question")`.
2. **Council synthesis**: `robofang_ask("Your prompt", use_council=True)` — triggers multi-persona debate for complex decisions.
3. **Multi-step goal**: `robofang_agentic_workflow("Summarize fleet status and suggest one improvement")` — autonomous orchestration.
4. **Patrol and report**: `robofang_task_run_from_phrase("yahboom robot patrol and report back anomalies")` — for "RoboFang, start yahboom robot patrol".
5. **Audit trail**: `robofang_deliberations(limit=50)` after any council interaction to review reasoning.

## Council Architecture

The Council of Dozens operates in three phases:
- **Enrich**: Each persona expands the query from its domain perspective.
- **Execute**: The execution persona synthesizes and acts.
- **Audit**: The auditor persona reviews the outcome for safety and completeness.

Use `robofang_ask(message, use_council=True)` to engage all three phases.

## Connection

Set `ROBOFANG_BRIDGE_URL` if the bridge is not at `http://localhost:10871`. This server (robofang-mcp) forwards all calls to the bridge. VR integration routes through resonite-mcp for immersive fleet visualization.

## Examples

- "What's the fleet status?" → `robofang_status(sections='all')` → `robofang_fleet()`
- "Should I deploy the new firmware?" → `robofang_ask("Analyze risks of firmware v2.3 deployment", use_council=True)`
- "Start a patrol route on yahboom-bot." → `robofang_task_run_from_phrase("yahboom robot patrol and report back anomalies")`
