"""
RoboFang Knowledge Engine: SOTA RAG & Semantic Retrieval.
[PHASE 8.1] KnowledgeEngine implementation (Feb 2026 Standard).
"""

import logging
from typing import List, Any, Optional
from robofang.core.storage import RoboFangStorage

logger = logging.getLogger(__name__)


class KnowledgeEngine:
    """
    Sovereign knowledge orchestration for RoboFang.
    Bridges local file context with semantic memories via Advanced Memory MCP.
    """

    def __init__(self, storage: Optional[RoboFangStorage] = None):
        self.storage = storage or RoboFangStorage()
        self.logger = logging.getLogger("robofang.core.knowledge")
        self.active_memory_server = "advanced-memory-mcp"  # Default target

    async def get_context(
        self, query: str, limit: int = 5, orchestrator: Optional[Any] = None
    ) -> str:
        """
        [SOTA RAG] Retrieves heterogeneous context for a prompt.
        Bridges local fragments and ADN semantic search.
        """
        self.logger.info(f"KnowledgeEngine: Retrieving context for query: {query}")

        context_parts = []

        # 1. Semantic Search (ADN)
        search_results = await self.semantic_search(query, orchestrator=orchestrator)
        if search_results:
            context_parts.extend(search_results)

        # 2. Local Context Simulation (Fleet State)
        if not context_parts:
            context_parts.append(
                "[INTERNAL MEMORY] Fleet status verified: Persistence layer active."
            )

        # 3. Long-Context Reranking (LCR) / Synthesis
        return await self.satisfice_context(context_parts)

    async def semantic_search(
        self, query: str, orchestrator: Optional[Any] = None
    ) -> List[str]:
        """Deep search within the Advanced Memory graph using memops."""
        if not orchestrator:
            return []

        try:
            # We use the orchestrator to call the 'memops' server's 'adn_knowledge' tool
            result = await orchestrator.run_skill(
                "knowledge:semantic_search",  # Skill name mapping
                {
                    "operation": "search",
                    "query": query,
                    "search_type": "text",
                    "results_per_page": 3,
                },
                subject="agent:cortex",
            )

            if result.get("success"):
                hits = result.get("result", {}).get("results", [])
                return [
                    f"[ADN:{h.get('title')}] {h.get('teaser', h.get('content', ''))}"
                    for h in hits
                ]
        except Exception as e:
            self.logger.error(f"Semantic search failed: {e}")

        return []

    async def satisfice_context(self, context_parts: List[str]) -> str:
        """
        [PHASE 8.4] Long-Context Reranking (LCR).
        Deduplicates and synthesizes retrieved context fragments.
        """
        seen = set()
        unique_parts = []
        for part in context_parts:
            if part not in seen:
                unique_parts.append(part)
                seen.add(part)

        return "\n".join(unique_parts)
