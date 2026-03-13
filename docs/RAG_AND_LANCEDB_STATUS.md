# RAG and LanceDB Status in RoboFang

**As of current codebase:** In-repo LanceDB RAG is **implemented but not wired** into the main agent loop. The orchestrator’s context path uses Advanced Memory MCP only.

---

## What exists

### 1. In-repo LanceDB stack (implemented, unused in main flow)

| Component | Location | Role |
|-----------|----------|------|
| **BaseVectorStore** | `src/robofang/core/rag_base.py` | LanceDB + fastembed (BAAI/bge-small-en-v1.5). `add_documents()`, `search()` with optional `where`. |
| **RoboFangRAG** | `src/robofang/core/robofang_rag.py` | Extends BaseVectorStore. `retrieve_context(query)`, `delta_sync(documents)` with `sync_tracking.json`. Default DB path: `data/lancedb`, table `robofang_media`. |

- **Dependencies:** `lancedb>=0.4.0`, `fastembed>=0.3.0` in `pyproject.toml`.
- **No callers:** Nothing in `main.py` or the orchestrator imports `RoboFangRAG` or calls `retrieve_context()`. No ingestion pipeline (e.g. from `docs/`) is wired.

### 2. KnowledgeEngine (used by orchestrator)

| Component | Location | Role |
|-----------|----------|------|
| **KnowledgeEngine** | `src/robofang/core/knowledge.py` | `get_context(query)` → calls **Advanced Memory MCP** via `orchestrator.run_skill("knowledge:semantic_search", ...)`. No LanceDB. |

- The Council / reasoning path that needs context uses **KnowledgeEngine** only (ADN / memops), not the in-repo LanceDB.

---

## Summary

- **LanceDB RAG:** Ready for use (embed, index, search, delta_sync) but **dormant**: no ingestion from `docs/` or elsewhere, and no retrieval from the orchestrator.
- **Production RAG for the agent:** Provided by **Advanced Memory MCP** (external); see MEMOPS_STATUS.md and connector docs.

To “well RAG” the docs folder (and robots, philosophy, etc.): either (1) wire RoboFangRAG into an ingestion pipeline that indexes `docs/**` (and related content) and into `get_context` alongside or instead of ADN, or (2) keep using Advanced Memory and ensure the doc tree is ingested there. For a single sovereign stack with no external MCP, (1) is the path.
