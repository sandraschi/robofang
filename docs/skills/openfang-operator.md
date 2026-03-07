# OpenFang Operator Skill

When to use which MCP tool and how to run Council workflows.

## Tool selection

| Goal | Tool | Notes |
|------|------|--------|
| Check hub is up and connectors | `openfang_status` | Run first before multi-step workflows |
| Get help on tools, council, connection, skills | `openfang_help` | No args: categories; `category=` topics; `category=` + `topic=` detail |
| Single question to the hub | `openfang_ask` | Use `use_council=True` for Council of Dozens synthesis |
| Full fleet registry (connectors + agents) | `openfang_fleet` | Same as GET /fleet |
| Recent reasoning log | `openfang_deliberations` | `limit=50` default |
| Multi-step goal (plan + execute) | `openfang_agentic_workflow` | Uses sampling and sub-tools |

## Council workflow

1. Ensure hub is up: `openfang_status`.
2. Ask with Council: `openfang_ask(message="...", use_council=True)`. Council runs Enrich -> Execute -> Audit.
3. Optionally inspect reasoning: `openfang_deliberations(limit=20)` then summarize for the user.
4. For goals that mix status, ask, and deliberations, use `openfang_agentic_workflow(goal="...")`.

## Connection

- Bridge: default port 10871 (`PORT` env). Health: GET /health.
- MCP SSE: same process, `http://localhost:10871/sse` (or your PORT).
- Dashboard: port 10864/10870, consumes Bridge for logs and fleet.

## Prompts

- **openfang_quick_start**: Step-by-step setup (Bridge, dashboard, MCP URL).
- **openfang_council_workflow**: Plan for using Council of Dozens via OpenFang.
