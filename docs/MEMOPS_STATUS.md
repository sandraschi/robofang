# Memops / memory status

**Memops** is the Common Memory Pool for the RoboFang council: a RAG substrate used for semantic search, context retrieval, and persistent agent memory.

## Current wiring

| Layer | Implementation | Status |
|-------|----------------|--------|
| **Connector** | `advanced-memory` in `federation_map.json` (`mcp_backend` e.g. `http://localhost:10705`) | MCPBridgeConnector; active when advanced-memory MCP (and webapp) are running. |
| **Knowledge / RAG** | Orchestrator `KnowledgeEngine` + optional ADN/semantic backend | Used by `orchestrator.ask()` for RAG context when enabled. |
| **Journal bridge** | `src/robofang/bridges/journal_bridge.py` | TODOs: call `mcp_memops.write_note` / ADN content and search ADN for `#moltbridge` observations; not yet implemented. |

## Summary

- **Memory pool in use**: When the **advanced-memory** MCP server (and its webapp) are running and enabled in `federation_map.json`, the bridge can use it via MCPBridgeConnector for tool calls (e.g. semantic search, notes). The cognitive architecture doc refers to this as `memops` + `adn_knowledge`.
- **user-memops**: If you run a separate MCP server named user-memops (e.g. Cursor MCP), it is independent of the bridge’s connector list; the bridge does not auto-wire it. To use it from RoboFang, add it as a connector in `federation_map.json` with its HTTP backend URL, or call it from a Hand/skill.
- **Outstanding**: Journal bridge ADN write/search (moltbridge) is still placeholder/TODO; no mock — just not wired to memops/ADN yet.

## References

- `docs/COGNITIVE_ARCHITECTURE.md` — Memory Pool and RAG role.
- `docs/connector_taxonomy.md` — `advanced_memory` under Workflow/Knowledge (PLANNED in taxonomy; in code it is REAL via MCPBridgeConnector when advanced-memory repo is enabled).
- `configs/federation_map.json` — `connectors.advanced-memory.enabled` and `mcp_backend`.
