"""JournalBridge: Connects legacy Moltbook concepts to the ADN memory graph (advanced-memory-mcp)."""

import logging
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def _has_call_tool(client: Any) -> bool:
    return (
        client is not None
        and hasattr(client, "call_tool")
        and callable(getattr(client, "call_tool"))
    )


class JournalBridge:
    """
    Maps legacy Journal/Moltbook entries to ADN (advanced-memory-mcp).
    Expects adn_client with async call_tool(name, arguments) (e.g. MCPBridgeConnector).
    Uses portmanteau tools adn_content (write) and adn_knowledge (search); falls back to
    write_note/search_notes when the server runs in full-tools mode.
    """

    def __init__(self, adn_client: Any):
        self.adn = adn_client

    async def promote_to_adn(self, entry: Dict[str, Any]) -> bool:
        """
        Converts a Moltbook entry into an ADN note via advanced-memory.
        Uses adn_content(operation='write') in portmanteau mode, or write_note in full-tools mode.
        """
        content = entry.get("content", "")
        tags = entry.get("tags", [])
        timestamp = entry.get("timestamp", datetime.now().isoformat())

        observation = f"- [journal] {content} #moltbridge " + " ".join([f"#{t}" for t in tags])
        title = f"journal_{timestamp[:19].replace(':', '-')}"
        tags_str = "journal,moltbridge"
        if isinstance(tags, list):
            tags_str = ",".join(["journal", "moltbridge"] + [str(t) for t in tags])
        elif isinstance(tags, str):
            tags_str = f"journal,moltbridge,{tags}"

        if not _has_call_tool(self.adn):
            logger.info("Promoting journal entry (no ADN client): %s...", content[:50])
            return False

        # Portmanteau mode: adn_content(operation='write', identifier=title, content=..., folder=..., tags=...)
        try:
            result = await self.adn.call_tool(
                "adn_content",
                {
                    "operation": "write",
                    "identifier": title,
                    "content": observation,
                    "folder": "journal",
                    "tags": tags_str,
                    "entity_type": "note",
                },
            )
            if result is not None and isinstance(result, dict) and result.get("success"):
                logger.info("Promoted journal entry to ADN via adn_content: %s...", content[:50])
                return True
            if result is not None and isinstance(result, dict) and result.get("error"):
                logger.warning(
                    "adn_content write failed: %s",
                    result.get("message", result.get("error")),
                )
        except Exception as e:
            logger.debug("adn_content write failed, trying write_note: %s", e)

        # Full-tools mode: write_note(title, content, folder, tags)
        try:
            result = await self.adn.call_tool(
                "write_note",
                {
                    "title": title,
                    "content": observation,
                    "folder": "journal",
                    "tags": tags_str,
                    "entity_type": "note",
                },
            )
            if result is not None:
                logger.info("Promoted journal entry to ADN via write_note: %s...", content[:50])
                return True
        except Exception as e:
            logger.error("Promotion failed: %s", e)
            return False

        return False

    async def get_recent_entries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves recent #moltbridge entries from ADN.
        Uses adn_knowledge(operation='search') in portmanteau mode, or search_notes in full-tools mode.
        """
        if not _has_call_tool(self.adn):
            return []

        # Portmanteau mode: adn_knowledge(operation='search', query='#moltbridge', results_per_page=limit)
        try:
            result = await self.adn.call_tool(
                "adn_knowledge",
                {
                    "operation": "search",
                    "query": "#moltbridge",
                    "results_per_page": limit,
                },
            )
            if result is not None and isinstance(result, dict):
                return _parse_search_result(result, limit)
        except Exception as e:
            logger.debug("adn_knowledge search failed, trying search_notes: %s", e)

        # Full-tools mode: search_notes(query, page_size=limit)
        try:
            result = await self.adn.call_tool(
                "search_notes",
                {"query": "#moltbridge", "page_size": limit},
            )
            if result is not None and isinstance(result, dict):
                return _parse_search_result(result, limit)
        except Exception as e:
            logger.error("get_recent_entries failed: %s", e)

        return []


def _parse_search_result(result: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    """Map advanced-memory search response to list of {content, title, timestamp}."""
    # adn_knowledge returns { success, operation, summary, result: { results, ... } }
    data = result.get("result", result)
    items = data.get("results", data.get("items", []))
    if not isinstance(items, list):
        return []

    out = []
    for hit in items[:limit]:
        if isinstance(hit, dict):
            out.append(
                {
                    "content": hit.get("content", hit.get("snippet", hit.get("teaser", "")) or ""),
                    "title": hit.get("title", ""),
                    "timestamp": hit.get("updated_at") or hit.get("created_at", ""),
                }
            )
        else:
            out.append({"content": str(hit), "title": "", "timestamp": ""})
    return out
