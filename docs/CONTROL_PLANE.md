# Control plane vs hands (fleet architecture)

RoboFang orchestrates **installed MCP servers**; it should not become a duplicate of every server’s source tree.

## Canonical write-up

Fleet-wide pattern (three phases: index → install → operate), what goes in `robofang/tools/` vs `hands/`, and how optional indexers like **iflow-mcp-catalog** plug in **without** vendoring full repos:

**`D:\Dev\repos\mcp-central-docs\operations\FLEET_CONTROL_PLANE.md`**

## Quick rules

| Place | Use for |
|-------|---------|
| **`hands/`** | Cloned MCP repos you installed (bridge default). |
| **`robofang/tools/`** | Thin automation: manifest checks, port sync, fleet analysis scripts. |
| **Each MCP repo** | The actual server, webapp, tests — source of truth. |

## Meetup / demo notes

Short, provable Cursor + MCP demos (Stammtisch-friendly):

**`D:\Dev\repos\mcp-central-docs\research\agentic-ide\CURSOR_STAMMTISCH_DEMO_KIT.md`**

## Related

- [MCP_FLEET.md](./MCP_FLEET.md) — discovery, `robofang.json`, bridge APIs.
