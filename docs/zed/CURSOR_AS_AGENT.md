# Cursor as ACP agent

Cursor CLI can run as an **ACP agent**: other ACP clients (Zed, JetBrains, Neovim, etc.) connect to it and use Cursor’s model and tools. The Cursor **desktop app** does not host external ACP agents; it only runs Cursor’s own agent. ACP support is “Cursor as agent, other editors as client.”

## Running Cursor in ACP mode

```bash
agent acp
```

Communication is JSON-RPC 2.0 over **stdio**: client writes to stdin, Cursor writes to stdout; stderr for logs. Framing: newline-delimited JSON.

## Authentication

Cursor advertises `cursor_login` as the ACP auth method. Pre-authenticate so the client doesn’t need to prompt:

- **Env:** `CURSOR_AUTH_TOKEN` or `CURSOR_API_KEY`
- **CLI:** `agent login` (then run `agent acp`)
- **CLI args:** `agent --api-key "$CURSOR_API_KEY" acp`

Example with env:

```powershell
$env:CURSOR_API_KEY = "your-key"
agent acp
```

## Session flow (typical)

1. Client sends `initialize` (protocol version, capabilities).
2. Client sends `authenticate` with `methodId: "cursor_login"`.
3. Client sends `session/new` (or `session/load`) with `cwd`, `mcpServers`, etc.
4. Client sends `session/prompt` with the user message.
5. Cursor may send `session/request_permission` for tool use; client responds with `allow-once`, `allow-always`, or `reject-once`.
6. Cursor streams output via `session/update` notifications (e.g. `agent_message_chunk` with text).

## MCP servers

- ACP uses **project-level or user-level** `.cursor/mcp.json` for MCP server config.
- **Team-level** MCP (Cursor dashboard) is **not** supported in ACP mode.
- Launch `agent acp` from the project directory so the right `mcp.json` is used; approve servers as needed.

## Modes

Same as CLI: `ask` (read-only), `plan` (planning, read-only), `agent` (full tool access). Client typically chooses mode when creating or prompting the session.

## Cursor extension methods (optional for clients)

Cursor can send extra JSON-RPC methods for richer UX; clients may implement them:

| Method | Purpose |
|--------|---------|
| `cursor/ask_question` | Multiple-choice questions. |
| `cursor/create_plan` | Explicit plan approval. |
| `cursor/update_todos` | Todo state updates. |
| `cursor/task` | Subagent task completion. |
| `cursor/generate_image` | Generated image output. |

## Using Cursor from Zed

1. Ensure `agent` (Cursor CLI) is on PATH and authenticated (`agent login` or `CURSOR_API_KEY`).
2. In Zed, add a custom agent that runs Cursor in ACP mode, e.g.:

```json
{
  "agent_servers": {
    "Cursor": {
      "type": "custom",
      "command": "agent",
      "args": ["acp"]
    }
  }
}
```

Use the full path to `agent` on Windows if needed (e.g. `C:\\Users\\...\\AppData\\Local\\Programs\\cursor\\resources\\bin\\agent.exe` or wherever Cursor installs it).

## Using Cursor from Neovim (avante.nvim)

Configure the Cursor ACP provider with `command`/`args` pointing to `agent` and `acp`, and `auth_method: "cursor_login"`. See [Cursor docs — Neovim](https://cursor.com/docs/cli/acp#neovim-avantenvim).

## References

- [Cursor — ACP](https://cursor.com/docs/cli/acp)
- [Zed as client](ZED_AS_CLIENT.md)
- [ACP overview](ACP_OVERVIEW.md)
