# robofang-mcp

Thin MCP server so **Cursor** and **Antigrav** (and other MCP clients) can converse with RoboFang. Optional **webapp** in `webapp/` (ports 10760 frontend, 10761 backend) for status and tool testing — synced with fleet MCP webapp style. The main RoboFang repo has the full Sovereign Hub UI (`robofang-hub`).

- **FastMCP 3.1**: tools, prompts, sampling (`robofang_agentic_workflow`), optional skills.
- **Thin**: forwards all tool calls to the RoboFang bridge over HTTP. Start the bridge first (`robofang-bridge` or `python -m robofang.main`).

## Install

```bash
pip install robofang-mcp
```

Or from the repo (same repo as RoboFang):

```bash
cd robofang-mcp
pip install -e .
```

## Run

**stdio** (default — for Cursor/Antigrav):

```bash
robofang-mcp
```

**SSE** (e.g. for clients that connect via URL):

```bash
robofang-mcp --sse
# Listens on port 10867 by default; override with MCP_PORT=9000 robofang-mcp --sse
```

## Config

- **ROBOFANG_BRIDGE_URL** — Bridge base URL (default `http://localhost:10871`).
- **MCP_PORT** — Port when using `--sse` (default `10867`).

## Tools (same as bridge MCP, with richer status and help)

| Tool | Description |
|------|-------------|
| `robofang_status` | Bridge health and connector summary. Optional **sections**: `'all'` or `'activity,scheduling,config,hands,personas'` to include recent activity (deliberations + logs), scheduling (hands + routines), config (system + fleet settings), full fleet + autonomous hands, and council/personality names. Use **activity_limit** and **logs_limit** when sections include activity. |
| `robofang_bootstrap_check` | Check if the RoboFang bridge is reachable; returns bridge_url, bridge_reachable, and next_step hint. Use from IDE when bootstrapping. |
| `robofang_bootstrap_guide` | Step-by-step setup guide for the full stack (bridge, hub, robofang-mcp, webapp). **include_ide**: include Cursor/Antigrav and webapp steps. Returns steps list and current_step. |
| `robofang_help` | **Multi-level help**: **depth** `0`=summary, `1`=categories, `2`=topics per category, `3`=full text for one category, `full`=entire tree. **path** e.g. `'council.use_council'` jumps to that topic. Categories: tools, council, connection, skills. |
| `robofang_ask` | Send a message to the orchestrator (use_council=True for Council of Dozens) |
| `robofang_fleet` | Full fleet registry |
| `robofang_deliberations` | Recent reasoning log entries |
| **Agentic tasks (CRUD)** | |
| `robofang_task_list` | List all routines (scheduled tasks: patrol, etc.) |
| `robofang_task_get(routine_id)` | Get one task by id |
| `robofang_task_create_from_phrase(phrase, report_email?, run_now?)` | Create from natural language; run_now=true runs immediately and returns report |
| `robofang_task_run_from_phrase(phrase, report_email?)` | **Start task from phrase and report back** — e.g. "start yahboom robot patrol and report back anomalies" |
| `robofang_task_run(routine_id)` | Run an existing task once |
| `robofang_task_update(routine_id, name?, time_local?, recurrence?, action_type?, enabled?)` | Update a task |
| `robofang_task_delete(routine_id)` | Delete a task |
| `robofang_agentic_workflow` | High-level goal; uses sampling to plan and run steps |

## Prompts

- `robofang_quick_start` — Setup instructions (Bridge + this server).
- `robofang_council_workflow` — Plan for Council of Dozens (Enrich → Execute → Audit).

## Cursor / Antigrav

Add an MCP server with command:

- **Command**: `robofang-mcp` (or full path to `robofang-mcp` if not on PATH)
- **Args**: none for stdio; or `--sse` if your client supports connecting to a URL and you run with `--sse`.

Ensure the RoboFang bridge is running on the URL you set in `ROBOFANG_BRIDGE_URL`.

## Bootstrap / alternate setup path

**robofang-mcp** can double as an **alternative way to setup or bootstrap** the main RoboFang app and architecture:

- **IDE-first**: Install and run robofang-mcp from Cursor/Antigrav (or any MCP client) before the bridge or hub are running. Use `robofang_status` and `robofang_help` to see what the stack expects; use `robofang_agentic_workflow` with goals like “check if the RoboFang bridge is running and guide me to start it” or “list the steps to get the full Sovereign Hub (bridge + dashboard) running.”
- **Single entry point**: One MCP server in the client config (robofang-mcp) gives access to the whole hub once the bridge is up; the same server can surface setup prompts and help so the path from “nothing” to “full stack” stays MCP-centric.
- **Future**: Optional tools (e.g. `robofang_bootstrap_check`, `robofang_bootstrap_guide`) or prompts could formalise this: “is the bridge reachable?”, “what to install/run next?”, “clone repo X and run script Y.” Today, `robofang_quick_start` and `robofang_help` already support guided setup from the IDE.

So you can either **classic**: install RoboFang → run bridge → run hub → optionally add robofang-mcp for IDE access; or **MCP-first**: install robofang-mcp → add to IDE → use it to drive and bootstrap the rest of the architecture.

## Webapp (optional)

Operator UI: status, test ask, deliberations tail. See [webapp/README.md](webapp/README.md). Run backend (10761) then frontend dev (10760) or build frontend and serve from backend.
