# bumi-mcp — Noetix Bumi humanoid

**Status:** **0.1.0** — shipped MCP + web dashboard.

**Repo:** [github.com/sandraschi/bumi-mcp](https://github.com/sandraschi/bumi-mcp) · **Local:** `D:/Dev/repos/bumi-mcp`

**Ports:** **10774** (FastAPI + MCP `/mcp`) · **10775** (Vite)

**Central docs:** [mcp-central-docs/projects/bumi-mcp](https://github.com/sandraschi/mcp-central-docs/tree/master/projects/bumi-mcp)

---

## Role

Narrow **FastMCP 3.1** server for the **Noetix Bumi** headline humanoid: hero specs, public GitHub/OSS links, **`fleet_peers`** / **`virtual_twin`** composition guidance, optional **`BUMI_ROBOT_URL`** health probe. **Virtual Bumi (vbot)** is **not** implemented inside bumi-mcp; it is **enabled by the existing vbot-oriented MCP servers and webapps** in the mesh — notably **robotics-mcp**, **resonite-mcp**, **unity3d-mcp**, **blender-mcp**, **worldlabs-mcp**, plus **avatar-mcp** or others as wired.

**Expectations:** No physical Bumi in the maintainer fleet yet; Noetix is **oversubscribed** (hardware timeline **months**). **Bumi vbot** prep through that stack is the practical path until hardware arrives — see [bumi-mcp README](https://github.com/sandraschi/bumi-mcp#physical-bumi-vs-virtual-bumi-read-this).

---

## Tools (summary)

| Tool | Purpose |
|------|---------|
| `bumi(operation=...)` | `info`, `specs`, `sdk_links`, `market` (Noetix + China humbot + JD / tier-1 retail), `robot_status`, `virtual_twin`, `fleet_peers` |
| `bumi_agentic_workflow(goal)` | SEP-1577 sampling |
| `bumi_quick_start` | MCP prompt (`physical` \| `virtual` \| `fleet`) |

---

## Overlap with robotics-mcp

**robotics-mcp** keeps **`noetix_info`** and full orchestration. **bumi-mcp** is the **Bumi-first** dashboard and operator surface; agents can hold both if the mesh config allows.

---

## Mesh links

- [MCP_SERVERS.md](../MCP_SERVERS.md)  
- [MCP_TOOLS_ROADMAP.md](MCP_TOOLS_ROADMAP.md)  
- [connector_taxonomy.md](../connector_taxonomy.md) — add a **bumi-mcp** row when connector taxonomy is next revised  
