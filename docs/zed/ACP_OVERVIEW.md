# Agent Client Protocol (ACP) — Overview

## What is ACP?

The **Agent Client Protocol (ACP)** is an open standard that standardizes communication between **code editors/IDEs** and **AI coding agents**. It is analogous to the Language Server Protocol (LSP): one protocol, many editors and many agents.

- **Agents** that implement ACP work with any ACP-compatible editor.
- **Editors** that support ACP can use any ACP-compatible agent.

Protocol and SDKs are open source (Apache 2.0). Spec: https://agentclientprotocol.com/

## Why ACP?

Without a standard:

- Each editor needs custom integrations for every agent.
- Each agent needs editor-specific APIs to reach users.
- Result: lock-in, limited compatibility, repeated integration work.

ACP decouples agents and editors so both can innovate independently and users can choose the best editor and agent combination.

## Design

- **Transport:** JSON-RPC 2.0 over UTF-8; default is **stdio** (newline-delimited JSON). Remote (HTTP/WebSocket) is in progress.
- **UX-first:** Built for clear agent intent and streaming; reuses JSON shapes from MCP where possible.
- **Trust model:** The editor trusts the agent; the editor gives the agent access to local files and MCP servers. User retains control over tool approval.
- **Sessions:** One connection can have multiple concurrent sessions (multiple threads of conversation).

Editors typically spawn the agent as a subprocess and communicate over stdin/stdout. The editor can pass MCP server configuration so the agent can call MCP tools; the editor may also expose its own MCP server (e.g. via a proxy) to the agent.

## Ecosystem (as of March 2026)

### Editors (ACP clients)

| Editor | Status |
|--------|--------|
| Zed | Native ACP; real-time editing, agent panel, `agent_servers` for custom agents. |
| JetBrains IDEs | ACP support in progress (IntelliJ, PyCharm, WebStorm, etc.). |
| Neovim | Via plugins (e.g. CodeCompanion, avante.nvim). |
| Emacs | Via agent-shell. |
| marimo | Built-in ACP for notebooks. |
| AionUi | Free local GUI with ACP. |
| Obsidian | Via ACP plugin. |
| Web (AI SDK) | Via `@mcpc/acp-ai-provider`. |
| **Cursor IDE** | **Does not host external ACP agents.** Cursor runs as an ACP *agent* (`agent acp`) for other clients. |

### Agents (ACP servers)

Registered or widely used agents include: Claude Code (via adapter), Codex CLI, Cline, Gemini CLI, GitHub Copilot CLI, Goose, Kimi CLI, Mistral Vibe, OpenCode, Qwen Code, Stakpak, and others. Cursor CLI (`agent acp`) is also an ACP agent usable from Zed, JetBrains, Neovim, etc.

### ACP Registry

The ACP Registry centralizes agent distribution: register once, use from any ACP client. Zed and JetBrains have built-in registry support. See https://zed.dev/acp and the registry docs.

## Relation to MCP

- ACP is **editor ↔ agent**.
- MCP is **agent ↔ tools/servers** (files, APIs, etc.).
- ACP reuses MCP-style JSON where it makes sense. Editors often pass MCP server config into the agent so the agent can call MCP tools. So: **editor (ACP client) ↔ agent (ACP server + MCP client) ↔ MCP servers.**

## References

- [Introduction — ACP](https://agentclientprotocol.com/overview/introduction)
- [Architecture — ACP](https://agentclientprotocol.com/overview/architecture)
- [Zed — Agent Client Protocol](https://zed.dev/acp)
