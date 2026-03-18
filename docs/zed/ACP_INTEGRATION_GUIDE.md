# ACP integration guide

Two main integration angles:

1. **Consume ACP** — Use an ACP agent from an editor (e.g. Zed, JetBrains): add Cursor or another agent, get full editor UX.
2. **Expose an ACP agent** — Build an agent that speaks ACP so any ACP client can connect (e.g. RoboFang as an agent in Zed).

## Consuming ACP (use agents in your editor)

- **From Zed:** Use the Agents panel (Ctrl+? on Windows). Add agents from the ACP Registry or add a custom agent via Settings → Agents (`agent_servers` in `settings.json`). See [ZED_AS_CLIENT.md](ZED_AS_CLIENT.md).
- **From JetBrains:** Use the ACP integration (in progress); add Cursor or other agents from the registry.
- **From Neovim (e.g. avante.nvim):** Configure `acp_providers` to point at `agent acp` (Cursor) or another agent process.
- **Cursor IDE:** Cursor does **not** act as an ACP client that hosts external agents. To use ACP, use Zed or another ACP-capable editor and connect to Cursor via `agent acp` (see [CURSOR_AS_AGENT.md](CURSOR_AS_AGENT.md)).

Summary: **Cursor is supported as an ACP agent**, not as a client. Use Zed/JetBrains/Neovim as the client and Cursor (or RoboFang, once implemented) as the agent.

## Exposing an ACP agent (build an agent)

1. **Implement the protocol:** Your process speaks JSON-RPC over stdio (newline-delimited). Implement `initialize`, handle `session/new`, `session/prompt`, stream via `session/update` notifications, handle `session/request_permission` for tool approval.
2. **Use an SDK:** Python (`agent-client-protocol`), TypeScript, Rust, Kotlin — see https://github.com/agentclientprotocol and the spec.
3. **Python quick path:** `uv add agent-client-protocol`, subclass `acp.Agent`, implement `prompt()`, run with `run_agent()`. See the [Python SDK quickstart](https://agentclientprotocol.github.io/python-sdk/quickstart/).
4. **Register (optional):** Add your agent to the ACP Registry so it appears in Zed/JetBrains without manual config.
5. **MCP:** If your agent should use MCP tools, the editor will pass MCP server configuration in the session; connect to those servers from your agent and forward tool calls.

See [ROBOFANG_ACP_ROADMAP.md](ROBOFANG_ACP_ROADMAP.md) for applying this to RoboFang and memops.

## Cursor: agent only

| Role | Cursor |
|------|--------|
| **ACP client** (host other agents) | No — Cursor IDE does not support adding custom ACP agents. |
| **ACP agent** (run inside other editors) | Yes — run `agent acp`; Zed, JetBrains, Neovim can connect. |

So “both” (consume + expose) for Cursor means: **consume** by using Zed/JetBrains as the client with Cursor as the agent; **expose** by building a separate ACP agent (e.g. RoboFang) that other clients can add.

## References

- [ACP spec](https://agentclientprotocol.com/)
- [Python SDK quickstart](https://agentclientprotocol.github.io/python-sdk/quickstart/)
- [Zed ACP](https://zed.dev/acp)
- [Cursor ACP CLI](https://cursor.com/docs/cli/acp)
