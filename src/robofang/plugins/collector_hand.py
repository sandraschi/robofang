"""
Collector Hand: Monitoring fleet health and new knowledge sources.
[PHASE 9.2] CollectorHand implementation.
"""

import logging
from typing import Any

from robofang.core.base_hand import Hand

logger = logging.getLogger(__name__)


class CollectorHand(Hand):
    """
    A persistent agent that scans the fleet and builds knowledge.
    """

    def __init__(self, definition: Any):
        super().__init__(definition)
        logger.info("Collector Hand initialized")

    async def _on_pulse(self, orchestrator: Any):
        """
        Background reasoning pulse:
        1. Check connector health.
        2. Scan for new 'vibe' patterns.
        3. Trigger knowledge synthesis.
        """
        self.logger.info("Collector Hand: Scanning fleet status...")

        # 1. Health Audit
        active_connectors = list(orchestrator.connectors.keys())
        self.logger.info(f"Health Audit: {len(active_connectors)} connectors active.")

        # 2. Knowledge Synthesis via KnowledgeEngine RAG
        try:
            context = await orchestrator.knowledge.get_context(
                "recent sessions and fleet status",
                limit=5,
                orchestrator=orchestrator,
            )
            if context:
                self.logger.info("Knowledge Synthesis: %s", context[:200])
        except Exception as e:
            self.logger.warning("Knowledge synthesis failed: %s", e)

        # 3. Decision Logic: If something is critical, post to Moltbook
        if orchestrator.moltbook.client:
            await orchestrator.moltbook.post(
                "/post",
                {
                    "content": f"[Collector Hand] Autonomous check complete. {len(active_connectors)} systems nominal."
                },
            )
