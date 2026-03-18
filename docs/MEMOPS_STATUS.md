# Memops / memory status

**Memops** is the Common Memory Pool for the RoboFang council: a RAG substrate used for semantic search, context retrieval, and persistent agent memory.

## Current wiring

| Layer | Implementation | Status |
|-------|----------------|--------|
| **Connector** | `advanced-memory` in `federation_map.json` (`mcp_backend` e.g. `http://localhost:10705`) | MCPBridgeConnector; active when advanced-memory MCP (and webapp) are running. |
| **Knowledge / RAG** | Orchestrator `KnowledgeEngine` + optional ADN/semantic backend | Used by `orchestrator.ask()` for RAG context when enabled. |
| **Journal bridge** | `src/robofang/bridges/journal_bridge.py` | Full ADN: orchestrator creates `journal_bridge` with `connectors["advanced-memory"]`. Uses `adn_content`(write) and `adn_knowledge`(search); fallback to `write_note`/`search_notes` in full-tools mode. POST /journal/post promotes to ADN; GET /journal/recent returns ADN entries. |

## Summary

- **Memory pool in use**: When the **advanced-memory** MCP server (and its webapp) are running and enabled in `federation_map.json`, the bridge can use it via MCPBridgeConnector for tool calls (e.g. semantic search, notes). The cognitive architecture doc refers to this as `memops` + `adn_knowledge`.
- **user-memops**: If you run a separate MCP server named user-memops (e.g. Cursor MCP), it is independent of the bridge’s connector list; the bridge does not auto-wire it. To use it from RoboFang, add it as a connector in `federation_map.json` with its HTTP backend URL, or call it from a Hand/skill.
- **Journal bridge**: Fully wired. Orchestrator instantiates it with the advanced-memory connector. POST /journal/post promotes each entry to ADN (folder `journal`, tag `#moltbridge`). GET /journal/recent returns recent entries from ADN. Ensure advanced-memory is enabled in `federation_map.json` and its MCP/webapp is running (e.g. port 10705).

## ACP and memops

When using **ACP** (Agent Client Protocol) from editors like Zed or JetBrains, the **editor** passes MCP server configuration to the ACP agent. To use memops (e.g. user-memops or advanced-memory) from that agent, configure it in the editor’s MCP settings so the agent can call memops tools. RoboFang’s bridge does not auto-wire a separate user-memops instance; for ACP workflows, add memops to the editor’s MCP config. The **canonical** ACP/memops/Zed/Cursor guide lives in the **mcp-central-docs** depot at `D:\Dev\repos\mcp-central-docs` (zed folder there). A reference copy is in [docs/zed/](zed/README.md) in this repo.

## References

- `docs/COGNITIVE_ARCHITECTURE.md` — Memory Pool and RAG role.
- `docs/connector_taxonomy.md` — `advanced_memory` under Workflow/Knowledge (PLANNED in taxonomy; in code it is REAL via MCPBridgeConnector when advanced-memory repo is enabled).
- `configs/federation_map.json` — `connectors.advanced-memory.enabled` and `mcp_backend`.
- **Canonical:** `D:\Dev\repos\mcp-central-docs` (zed folder) — ACP, Zed, Cursor, RoboFang integration. Reference copy: `docs/zed/` in this repo.
