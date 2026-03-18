# RoboFang and ACP — roadmap and memops

RoboFang has an MCP server, bridges (e.g. journal), and uses **memops** (advanced-memory / ADN) as the Common Memory Pool. This doc describes how ACP fits in: consuming ACP and exposing RoboFang as an ACP agent, with a note on memops.

## Consume ACP (use ACP agents from RoboFang’s perspective)

- **From Cursor IDE:** Cursor does not host external ACP agents, so you cannot “add” Zed’s registry agents inside Cursor. To use another agent (e.g. Gemini CLI), use Zed or JetBrains as the client.
- **From Zed/JetBrains:** Add Cursor as the agent (`agent acp`) or any registry agent. MCP servers (including user-memops or advanced-memory) can be configured in the client so the agent gets MCP; ensure project/user `.cursor/mcp.json` (or equivalent) lists the right MCP servers when using Cursor as agent.
- **Memops:** When an ACP agent runs in Zed/JetBrains, the **editor** passes MCP config to the agent. If memops (e.g. user-memops or advanced-memory) is in that config and reachable, the agent can call memops tools (search, notes, ADN) during the session. RoboFang’s bridge does not auto-wire a separate user-memops; for RoboFang orchestration you use `federation_map.json` and the bridge’s connectors. For “human in Zed using Cursor + memops,” configure memops in the editor’s MCP config so Cursor-as-agent can use it. See [MEMOPS_STATUS.md](../MEMOPS_STATUS.md).

## Expose RoboFang as an ACP agent

Goal: let any ACP client (Zed, JetBrains, etc.) add “RoboFang” as an agent and get RoboFang’s tools (and optionally memops) in-editor.

### Option A: Thin ACP wrapper

- Add a small ACP agent (e.g. Python with `agent-client-protocol`) that:
  - Speaks ACP over stdio.
  - Receives MCP server config from the editor (so the editor can pass memops, fileops, etc.).
  - Forwards prompts to existing RoboFang logic or to a subprocess (e.g. bridge/orchestrator) and streams back replies; or
  - Acts as a thin proxy: the LLM runs inside the ACP process, uses MCP tools (including those provided by the editor and/or RoboFang-specific MCPs), and streams session updates.
- Package as an entrypoint (e.g. `robofang-acp` or `python -m robofang.acp_agent`) so users can add it to Zed `agent_servers` or register it in the ACP Registry.

### Option B: Reuse Cursor + RoboFang MCP

- User runs Cursor as the ACP agent from Zed (`agent acp`) with MCP configured to include RoboFang’s MCP server(s) and memops. No separate “RoboFang ACP agent” binary; RoboFang is used via MCP. This is “consume” only; no dedicated “RoboFang” agent in the registry.

### Recommended direction for “RoboFang as agent”

- Implement **Option A**: a dedicated ACP agent that represents RoboFang (orchestrator, council, hands, memops). That gives a single “RoboFang” agent in any ACP client, with clear branding and control over which MCP tools and memory the agent uses.
- Dependencies: `agent-client-protocol` (Python), design of prompt/session handling (bridge vs in-process), and how MCP servers are selected (editor-provided vs fixed list for RoboFang).

## Memops and ACP

- **Inside RoboFang (bridge/orchestrator):** Memops is wired via `federation_map.json` and the journal bridge; see [MEMOPS_STATUS.md](../MEMOPS_STATUS.md). No change for ACP.
- **Inside an external ACP agent (e.g. Cursor in Zed):** Memops is available to the agent only if the **editor** configures it as an MCP server and passes it to the agent. Configure user-memops (or advanced-memory) in Zed’s/editor’s MCP config so the ACP agent can call it.
- **RoboFang ACP agent (future):** The RoboFang ACP agent can be built to always use a configured memops connector (e.g. HTTP backend from env or config), so memory is consistent with the rest of RoboFang.

## Summary

| Angle | Action |
|-------|--------|
| **Consume ACP** | Use Zed (or JetBrains/Neovim) as client; add Cursor or other agents. Configure MCP (including memops) in the editor so the agent can use it. |
| **Expose RoboFang** | Build a small ACP agent (Python SDK) that fronts RoboFang/orchestrator and optional memops; add to Zed `agent_servers` or ACP Registry. |
| **Memops** | Unchanged for bridge/orchestrator; for ACP agents in other editors, add memops to the editor’s MCP config. |

## References

- **Canonical docs:** `D:\Dev\repos\mcp-central-docs` (zed folder). This file is a reference copy in robofang.
- [ACP overview](ACP_OVERVIEW.md) | [ACP integration guide](ACP_INTEGRATION_GUIDE.md) | [Zed as client](ZED_AS_CLIENT.md)
- [MEMOPS_STATUS.md](../MEMOPS_STATUS.md)
- [Python SDK quickstart](https://agentclientprotocol.github.io/python-sdk/quickstart/)
