---
title: "MCP Agentic Mesh - Sampling Bridges and Inter-Server Orchestration"
category: architecture
status: active
audience: mcp-dev
skill_candidate: true
related:
  - architecture/AGENTIC_MESH_SECURITY.md
  - architecture/AGENTIC_MESH_robofang_INTEGRATION.md
  - fastmcp/sep-1577-sampling-with-tools.md
last_updated: 2026-02-23
---

# MCP Agentic Mesh — Sampling Bridges & Inter-Server Orchestration

**Status:** Design Reference  
**Date:** 2026-02-23  
**Owner:** Sandra Schi  
**Relates to:** [SEP-1577 Sampling with Tools](../fastmcp/sep-1577-sampling-with-tools.md), [robofang PRD](../../robofang/PRD.md)

---

## Concept

Each MCP server exposes tools. FastMCP 2.14.1+ allows any tool to call `ctx.sample(tools=[...])` — the client LLM orchestrates using those tools. If the tools in that list are **bridge functions that call other MCP servers**, you get a mesh: servers delegating to servers, autonomously, with structured validated results at every hop.

This is not just convenient. It is a qualitative shift — from a set of isolated tools to a **multi-agent system** with no separate orchestration framework required.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Claude Desktop / Cursor / robofang)                    │
│  Calls one meta-tool.  Receives one structured result.          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ctx.sample(tools=[bridge_A, bridge_B, ...])
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR SERVER  (e.g. advanced-memory-mcp / robofang)     │
│                                                                 │
│  agentic_content_workflow()                                     │
│    ├── search_knowledge_base()      ← local leaf tool           │
│    ├── bridge_filesystem()          ← calls filesystem-mcp      │
│    ├── bridge_local_llm()           ← calls local-llm-mcp       │
│    └── bridge_camera()             ← calls tapo-camera-mcp      │
└──────┬────────────────┬────────────────┬────────────────────────┘
       │                │                │
       ▼                ▼                ▼
┌────────────┐  ┌──────────────┐  ┌──────────────────┐
│filesystem  │  │local-llm-mcp │  │tapo-camera-mcp   │
│-mcp        │  │              │  │                  │
│read_file   │  │infer()       │  │get_latest_clip() │
│write_file  │  │embed()       │  │trigger_recording │
└────────────┘  └──────────────┘  └──────────────────┘
```

---

## Bridge Function Pattern

A bridge function is a plain Python async function that calls another MCP server's HTTP/stdio API and returns a string. It has a docstring — FastMCP generates a schema from it. It is passed as a callable to `ctx.sample(tools=[...])`.

```python
async def bridge_read_file(path: str) -> str:
    """
    Read a file from the local filesystem via filesystem-mcp.
    path: Absolute Windows path, e.g. D:/dev/repos/myproject/README.md
    Returns the file content as text, or an error string.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:10820/tools/read_file",
            json={"path": path},
            timeout=10.0,
        )
        return resp.json().get("content", f"ERROR: {resp.status_code}")
```

---

## Trust Model

| Tier | Servers | Can call |
|---|---|---|
| 0 — Read-only | advanced-memory-mcp (read) | Nothing physical |
| 1 — Local data | filesystem-mcp, advanced-memory-mcp (write) | Tier 0 only |
| 2 — Inference | local-llm-mcp | Tier 0-1 |
| 3 — Device control | tapo-camera-mcp | Tier 0-2, NOT Tier 4 |
| 4 — Physical actuation | robotics-mcp | ISOLATED — human gate required |

---

## Real Use Cases (Sandra's fleet)

**Camera event → knowledge log:** motion detected → classify scene → log event with tags → archive clip

**Research → skill synthesis:** arxiv + github → check existing notes → synthesise draft → save skill

**Robotics (with mandatory human confirmation gate):** sense → plan → HUMAN CONFIRM → actuate → log

---

See: [AGENTIC_MESH_robofang_INTEGRATION.md](AGENTIC_MESH_robofang_INTEGRATION.md)  
See: [AGENTIC_MESH_SECURITY.md](AGENTIC_MESH_SECURITY.md)
