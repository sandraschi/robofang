# Zed as ACP client

Zed is a first-class ACP client: you can use ACP agents from the Agents panel with full editor integration (multi-file editing, codebase context, streaming).

## Adding an agent

### From the ACP Registry

1. Open the agent panel: **Ctrl+?** (Windows/Linux) or **Cmd+?** (macOS).
2. Click **+** to add an agent.
3. Choose an agent from the registry (e.g. Claude Code, Cline, Gemini CLI, Cursor via external config). No need to install the binary yourself for registry-listed agents where Zed knows the command.

### Custom agent (your own process)

Add an entry under `agent_servers` in Zed settings. Path: **Settings → Agents** or edit `settings.json` directly.

**Example — Python script:**

```json
{
  "agent_servers": {
    "My Python Agent": {
      "type": "custom",
      "command": "C:\\path\\to\\.venv\\Scripts\\python.exe",
      "args": ["C:\\path\\to\\my_agent.py"]
    }
  }
}
```

**Example — uv run:**

```json
{
  "agent_servers": {
    "Echo Agent (uv)": {
      "type": "custom",
      "command": "uv",
      "args": [
        "run",
        "C:\\path\\to\\agentclientprotocol\\python-sdk\\examples\\echo_agent.py"
      ]
    }
  }
}
```

Zed spawns the process and talks ACP over stdin/stdout. Use **absolute paths** for `command` and `args` on Windows.

## Testing with the echo agent

1. Install the Python SDK: `uv add agent-client-protocol` (or `pip install agent-client-protocol`).
2. Run the echo example (from the SDK repo or installed examples):  
   `python examples/echo_agent.py` (keep it running in a terminal if you run it manually), or point Zed at the script via `agent_servers` as above.
3. In Zed, open the agent panel, select the echo agent, send a message. You should see streamed `session/update` responses.

## MCP in Zed

When you start a session, Zed can pass MCP server configuration to the agent. Configure MCP servers in your project or user settings so the agent can call your MCP tools (e.g. memops, fileops) during the session.

## References

- [Zed — Agent Client Protocol](https://zed.dev/acp)
- [Bring your own agent to Zed](https://zed.dev/blog/bring-your-own-agent-to-zed)
- [ACP Python SDK quickstart](https://agentclientprotocol.github.io/python-sdk/quickstart/)
