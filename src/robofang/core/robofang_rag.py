"""
RoboFang RAG: semantic search and delta-sync. Wholly contained in this repo; uses robofang.core.rag_base.
"""

import json
import logging
from pathlib import Path
from typing import Any

from robofang.core.rag_base import BaseVectorStore

logger = logging.getLogger("robofang.core.robofang_rag")


class RoboFangRAG(BaseVectorStore):
    """Semantic Search RAG wrapper for RoboFang Sovereign Substrate."""

    def __init__(
        self,
        db_path: str = "d:/Dev/repos/robofang/data/lancedb",
        table_name: str = "robofang_media",
        embedding_model_name: str = "BAAI/bge-small-en-v1.5",
    ):
        super().__init__(
            db_path=db_path,
            table_name=table_name,
            embedding_model_name=embedding_model_name,
        )
        self.tracking_file = Path(db_path) / "sync_tracking.json"
        self.tracking_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.tracking_file.exists():
            self.tracking_file.write_text("{}", encoding="utf-8")

    def _load_tracking(self) -> dict[str, float]:
        with open(self.tracking_file, encoding="utf-8") as f:
            return json.load(f)

    def _save_tracking(self, data: dict[str, float]) -> None:
        with open(self.tracking_file, "w", encoding="utf-8") as f:
            json.dump(data, f)

    def retrieve_context(self, query: str, limit: int = 5) -> str:
        """Query the semantic memory and return formatted context."""
        try:
            results = self.search(query, limit=limit)
            if not results:
                return "No relevant context found in RoboFang RAG."

            formatted = []
            for r in results:
                content = r.get("content", "")
                source = r.get("source", "Unknown")
                formatted.append(f"Source: {source}\n{content}")
            return "\n\n---\n\n".join(formatted)
        except Exception as e:
            logger.error("Error during RAG retrieval: %s", e)
            return f"Error retrieving semantic context: {e}"

    def delta_sync(self, documents: list[dict[str, Any]]) -> None:
        """
        Only index new or modified documents.
        documents: List of dicts with 'id', 'content', 'metadata', optional 'timestamp'.
        """
        tracking = self._load_tracking()
        to_index = []

        for doc in documents:
            doc_id = str(doc.get("id", ""))
            if not doc_id:
                continue
            doc_timestamp = doc.get("timestamp", 0)
            if doc_id not in tracking or tracking[doc_id] < doc_timestamp:
                to_index.append(doc)
                tracking[doc_id] = doc_timestamp

        if to_index:
            logger.info("Indexing %s new/updated documents into RoboFang RAG...", len(to_index))
            self.add_documents(to_index, overwrite=False)
            self._save_tracking(tracking)
        else:
            logger.info("No new documents to index via delta sync.")
