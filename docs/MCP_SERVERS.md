# RoboFang: MCP & Fleet Substrate

**Document Status**: Active Standard (v3.1)  
**Date**: 2026-03-12  
**Implementation**: FastMCP 3.1 (GA Feb 18, 2026)

---

## 1. The MCP Philosophy

In the RoboFang ecosystem, **Model Context Protocol (MCP)** is more than just a transport layer; it is the "Standard Interface for Reality." Every sensor, every motor, and every 3rd party API is abstracted into an MCP service. This allows our agents to interact with a unified toolset regardless of the underlying substrate (Virtual or Physical).

## 2. FastMCP 3.1 Standards

All RoboFang MCP servers MUST be built using **FastMCP 3.1**. This standard ensures:
- **Dual Transport (mandatory)**: One process serves **stdio** (for Cursor/Claude) and **HTTP** (for webapp/bridge) in the same event loop. Run uvicorn in an asyncio task and `await mcp.run_stdio_async()`. No "HTTP-only" or "stdio-only" servers for new builds.
- **Conversational Tool Returns**: Tools return rich, multi-modal objects (Markdown, Images, JSON) that the agent can reason over in a dialogic loop.
- **Portmanteau Tool Design**: To prevent tool explosion, we utilize consolidated tools with an `operation` parameter. 
  - *Bad*: `get_battery()`, `get_temperature()`, `get_signal()`.
  - *Good*: `get_telemetry(operation='battery')`.
- **Agentic workflow tools (SEP-1577, mandatory)**: Servers MUST expose at least one agentic workflow tool that uses **sampling** (FastMCP 3.1 `ctx.sample()` / sampling with tools). This allows the client LLM to orchestrate multi-step or multi-tool workflows autonomously. Servers are "sampling-aware"; complex operations MUST use sampling where appropriate rather than single-shot tool returns only.

**Repo requirements:** Every MCP server repo MUST include a **justfile** (just recipes for run, lint, test, etc.) and **llms.txt** (LLM-facing project summary per llms.txt spec).

**Canonical build standard:** `docs/standards/AGENT_PROTOCOLS.md` (FastMCP 3.1+ and SOTA requirements). Do not follow outdated 2.14.x-only guides.

## 3. Fleet Discovery & Mesh Topology

The **RoboFang Fleet** is a dynamic, federated mesh of MCP servers. Discovery is handled through a standardized `mcp_config.json` registry.

### 3.1 Connectivity Patterns
- **Local Grid**: STDIN/STDOUT based servers running on the host machine.
- **Remote Mesh**: SSE (Server-Sent Events) or WebSocket based servers running on edge devices (e.g., Orin Nano Super on a Bumi robot).
- **Federated Council**: High-altitude agents that orchestrate multiple lower-level MCP servers to achieve complex goals.

### 3.2 The `mcp_config.json` Standard

```json
{
  "mcpServers": {
    "bumi-core": {
      "command": "python",
      "args": ["-m", "robofang.mcp.bumi"],
      "env": {
        "BUMI_IP": "192.168.1.50",
        "LOG_LEVEL": "INFO"
      }
    },
    "notion-bridge": {
      "command": "npx",
      "args": ["-y", "@robofang/mcp-notion-bridge"],
      "env": {
        "NOTION_TOKEN": "secret_..."
      }
    }
  }
}
```

## 4. Building a RoboFang Connector

When building a new connector (e.g., for a new robot or service), follow the **SOTA-2026 Scaffolding**:

1. **Initialization**: Use `npx -y @fastmcp/create-server@latest`.
2. **Metadata**: Define a rich `description` and `examples` for every tool to assist LLM reasoning.
3. **Safety Guard**: Implement the `robofang_safety` decorator for any destructive operations (e.g., file deletion, motor torque enable).
4. **Port Allocation**: Backend webapps MUST use the reserved range **10700–10800+**.

---
*The mesh is alive. Every tool is a limb.*
