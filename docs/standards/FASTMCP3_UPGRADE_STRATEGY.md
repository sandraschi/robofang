# FastMCP 3.0 Fleet Upgrade Strategy

**Date:** 2026-02-27  
**Trigger:** FastMCP 3.0 GA released February 18, 2026 (PrefectHQ/fastmcp)  
**Status:** speech-mcp upgraded ✅ | Fleet assessment pending

---

## Background — The FastMCP Family Tree

```
FastMCP 1.0 (jlowin, 2024)
    │
    ├──► Anthropic absorbed into mcp Python SDK (frozen there as "official")
    │    Package: mcp  (pip install mcp)
    │    This is what Claude Desktop / Cursor use internally.
    │    Not what our servers use directly.
    │
    └──► Standalone continued by jlowin → 2.x series
         2.10 → 2.11 → ... → 2.14.5  (our SOTA_STANDARDS.md target)
         Package: fastmcp  (pip install fastmcp)
         
FastMCP 2.14.5 (last 2.x, Dec 2025)
    │
    └──► FastMCP 3.0 (PrefectHQ/fastmcp, GA Feb 18 2026) ← WE ARE HERE
         Repo moved: jlowin/fastmcp → PrefectHQ/fastmcp
         PyPI unchanged, imports unchanged
         3.0.2 is current as of 2026-02-27
```

**Key point:** The "official Anthropic" FastMCP is version 1.0, frozen in the `mcp` SDK.
FastMCP 2.x and 3.x are the actively maintained standalone framework — not "official" but
the de facto standard (70% of all MCP servers, 1M downloads/day).

---

## What Changed in 3.0 — Relevance to Our Fleet

### Breaking changes that affect our servers

| Change | Impact | Our usage |
|---|---|---|
| `@mcp.tool()` decorator returns original function (not component object) | Low — only matters if you treated decorated fn as FunctionTool object | None of our servers do this |
| `ctx.set_state()` / `ctx.get_state()` now async | Medium — affects any server using session state | Check: advanced-memory, local-llm |
| 16 deprecated `FastMCP()` constructor kwargs removed | Low — most were deprecated since 2.8 with warnings | Audit each server |
| `mount(subserver, prefix=...)` → `mount(subserver, namespace=...)` | Low — only composite/mounted servers | Check: mcp-federation-hub |
| `mcp.add_tool_transformation()` → `mcp.add_transform()` | Low — rare usage pattern | |
| `FastMCP.as_proxy()` → `create_proxy()` | Low — only proxy servers | |
| PromptMessage type changed | Very low — we rarely define prompts | |
| `_fastmcp` metadata namespace → `fastmcp` | Very low — internal tagging | |

### Non-breaking changes that we WANT to adopt

| Feature | Benefit | Priority |
|---|---|---|
| `ctx.sample()` replacing `ctx.session.create_message()` | Cleaner sampling API, officially supported | High — adopt in all sampling servers |
| `@mcp.tool` (no parens) preferred over `@mcp.tool()` | Minor style improvement, both still work | Low — adopt in new code, don't mass-refactor |
| `FileSystemProvider` — tools from directory with hot-reload | Potentially useful for large tool sets | Medium — evaluate per server |
| `fastmcp discover` CLI — scans Claude Desktop / Cursor configs | Developer QoL, no code change needed | Free — just use the CLI |
| `fastmcp list` / `fastmcp call` CLI — inspect/invoke any server | Great for debugging without Claude Desktop | Free |
| `run_stdio_async()` still exists | Our stdio entry points are still correct | No change needed |

---

## Migration Effort Classification

### Group A: Zero changes needed (most servers)
Servers using only `@mcp.tool()`, basic FastMCP, no ctx.set_state, no prompt types.
Just bump `fastmcp>=3.0.0` in pyproject.toml and `uv sync`.

**Estimated effort per server:** 5 minutes  
**Servers (approximate):** ~60% of active fleet

### Group B: Minor changes needed
Servers using `ctx.session.create_message()` → replace with `ctx.sample()`.  
Servers using `ctx.set_state()` / `ctx.get_state()` → add `await`.

**Estimated effort per server:** 15–30 minutes  
**Servers to check:** advanced-memory-mcp, local-llm-mcp, ask_docs users

### Group C: Moderate changes needed
Servers using mounting with `prefix=` kwarg → rename to `namespace=`.  
Servers using 16 removed `FastMCP()` constructor kwargs (unlikely — most had deprecation warnings).

**Estimated effort per server:** 30–60 minutes  
**Servers to check:** mcp-federation-hub, dark-app-factory

---

## Recommended Fleet Upgrade Approach

### Phase 1 — Update standards (done)
Fleet standard is **FastMCP 3.1+** with **dual transport** (stdio + HTTP in one process). See `docs/MCP_SERVERS.md` and `standards/AGENT_PROTOCOLS.md`. Use `fastmcp>=3.1` in pyproject.toml.

### Phase 2 — Gold Standard servers first (1 day each)
Upgrade and test in order of importance:
1. `advanced-memory-mcp` ← most used, Group B (check ctx.set_state)
2. `devices-mcp` ← home security, Group A likely
3. `virtualization-mcp` ← Group A likely
4. `speech-mcp` ← **DONE** ✅

### Phase 3 — Active fleet batch upgrade (1 week, AI-assisted)
Use Cursor/Windsurf to batch process Group A servers:
- Find: `fastmcp>=2.1` in pyproject.toml files
- Replace: `fastmcp>=3.0.0`
- Run `uv sync` in each
- Test stdio startup: `.venv\Scripts\python.exe -m <server_module> --help` or equivalent

### Phase 4 — Group B/C individual fixes
Handle ctx.sample() migrations and mounting namespace changes server by server.

---

## The One-Line Test for Any Server

After bumping the version and running `uv sync`:

```powershell
# Test stdio startup (ctrl+C to exit)
& "D:\Dev\repos\<server>\.venv\Scripts\python.exe" -m <server_module>
```

If it starts without ImportError or TypeError → Group A complete.
If it errors → Group B/C, check the breaking changes table above.

---

## What We Do NOT Need to Do

- Change `from fastmcp import FastMCP` imports — already correct in all our servers
- Update the `mcp` package separately — fastmcp manages that as a dependency
- Migrate to `FileSystemProvider` — our decorator-based tools still work identically
- Remove `@mcp.tool()` parentheses — both forms still work, just style preference

---

## References

- FastMCP 3.0 GA announcement: https://www.jlowin.dev/blog/fastmcp-3-launch
- Upgrade guide: https://gofastmcp.com/development/upgrade-guide
- Changelog: https://gofastmcp.com/changelog
- GitHub (new home): https://github.com/PrefectHQ/fastmcp
- PyPI: https://pypi.org/project/fastmcp/
