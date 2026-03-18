# Zed, ACP, and agent–editor integration

**Canonical docs depot:** `D:\Dev\repos\mcp-central-docs`. The authoritative ACP/Zed/Cursor/memops docs live there (e.g. in a `zed/` folder or equivalent). Fleet registry and operations live in mcp-central-docs as well.

This folder (`robofang/docs/zed/`) is a **reference copy** only — e.g. when the workspace is only the RoboFang repo and mcp-central-docs is not open. To edit the canonical docs, edit in **mcp-central-docs**; sync or copy from there if you need this copy updated.

## Contents

| Document | Purpose |
|----------|---------|
| [ACP_OVERVIEW.md](ACP_OVERVIEW.md) | What ACP is, why it exists, ecosystem (editors, agents, registry). |
| [ACP_INTEGRATION_GUIDE.md](ACP_INTEGRATION_GUIDE.md) | How to integrate: consume ACP (use agents in editors) and expose an ACP agent (build one). Cursor vs Zed. |
| [ZED_AS_CLIENT.md](ZED_AS_CLIENT.md) | Zed as ACP client: `agent_servers`, registry, custom agents. |
| [CURSOR_AS_AGENT.md](CURSOR_AS_AGENT.md) | Cursor as ACP agent: `agent acp`, auth, MCP, extension methods. |
| [ROBOFANG_ACP_ROADMAP.md](ROBOFANG_ACP_ROADMAP.md) | RoboFang and memops: consuming ACP, exposing an ACP agent, MCP bridge. |

## Quick reference

- **ACP spec and docs:** https://agentclientprotocol.com/
- **Python SDK:** https://agentclientprotocol.github.io/python-sdk/quickstart/
- **Zed ACP page:** https://zed.dev/acp
- **Cursor ACP (CLI):** https://cursor.com/docs/cli/acp
- **Memops / memory:** See [MEMOPS_STATUS.md](../MEMOPS_STATUS.md); ACP note there links back here.

## Relationship to mcp-central-docs

- **Canonical depot:** `D:\Dev\repos\mcp-central-docs`. Fleet registry, operations, and the **canonical** ACP/Zed/Cursor/memops docs live there. There is no Cursor UI to add that folder when you are in the RoboFang workspace only.
- **This folder** (`robofang/docs/zed/`) is a reference copy for when you only have the RoboFang repo open. Edit the real docs in mcp-central-docs and copy/sync here if needed.
