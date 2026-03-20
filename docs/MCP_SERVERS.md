# RoboFang: MCP & Fleet Substrate

**Document Status**: Active Standard (v3.1)  
**Date**: 2026-03-20  
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

**Repo requirements:** Every MCP server repo MUST include a **justfile** (run, lint, test, optional **`mcpb pack`** recipe), **`llms.txt`** (LLM index) and **`llms-full.txt`** (full LLM corpus) as a **required pair** — see [mcp-central-docs integrations/llms-txt-manifest.md](https://github.com/sandraschi/mcp-central-docs/blob/master/integrations/llms-txt-manifest.md), **Python: uv** with committed **`uv.lock`** and **`pyproject.toml`**, root **`glama.json`** (Glama discovery), **`.pre-commit-config.yaml`** with **Ruff** hooks where practical, **`ty`** in CI with **`continue-on-error: true`** until clean, and produce a **`.mcpb`** via **`mcpb pack`** when Claude Desktop distribution is in scope (manifest per central MCPB doc — never **`mcpb init`**).

**Canonical build standard:** [mcp-central-docs `standards/AGENT_PROTOCOLS.md`](https://github.com/sandraschi/mcp-central-docs/blob/master/standards/AGENT_PROTOCOLS.md) and **[PACKAGING_STANDARDS.md §5](https://github.com/sandraschi/mcp-central-docs/blob/master/standards/PACKAGING_STANDARDS.md)** (uv · justfile · **llms.txt** + **llms-full.txt** · glama · `mcpb pack`). Do not follow outdated 2.14.x-only guides.

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

## 3.3 Fleet reference servers (sandraschi)

Examples maintained alongside the mesh (see **mcp-central-docs** `operations/MASTER_MCP_CONFIG.json`):

- **arxiv-mcp** — arXiv search, experimental HTML→Markdown, SQLite **FTS5** depot + favorites, Glama + webapp **10770/10771**. Repo: [sandraschi/arxiv-mcp](https://github.com/sandraschi/arxiv-mcp).

### 3.4 bumi-mcp (Noetix Bumi)

**bumi-mcp** — narrow MCP for the **Noetix Bumi** hero humanoid (same tier as **yahboom-mcp** / **dreame-mcp**): FastMCP 3.1, dashboard **10774/10775**, `bumi(operation=...)`, agentic workflow, virtual-twin **composition map** (delegate to **resonite-mcp**, **robotics-mcp**, **worldlabs-mcp**). **robotics-mcp** `noetix_info` remains valid for fleet-wide discovery.

**Repo:** [sandraschi/bumi-mcp](https://github.com/sandraschi/bumi-mcp) · **Docs:** [integrations/bumi-mcp.md](integrations/bumi-mcp.md) · **Central:** [mcp-central-docs/projects/bumi-mcp](https://github.com/sandraschi/mcp-central-docs/tree/master/projects/bumi-mcp).

---

## 4. Building a RoboFang Connector

When building a new connector (e.g., for a new robot or service), follow the **SOTA-2026 Scaffolding**:

1. **Initialization**: Use `npx -y @fastmcp/create-server@latest`.
2. **Metadata**: Define a rich `description` and `examples` for every tool to assist LLM reasoning.
3. **Safety Guard**: Implement the `robofang_safety` decorator for any destructive operations (e.g., file deletion, motor torque enable).
4. **Port Allocation**: Backend webapps MUST use the reserved range **10700–10800+**.

---
*The mesh is alive. Every tool is a limb.*
