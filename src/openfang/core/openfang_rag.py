import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

# To avoid complex cross-repo imports, we'll try to import BaseVectorStore dynamically
# assuming the user might run this alongside mcp-central-docs, or we import it via sys.path injection if needed.
import sys

logger = logging.getLogger("openfang_rag")

try:
    # Attempt to import if docs_mcp is installed or in path
    from docs_mcp.backend.rag_core import BaseVectorStore
except ImportError:
    # If not found, inject the path to mcp-central-docs
    MCP_CENTRAL_DOCS_PATH = os.environ.get(
        "MCP_CENTRAL_DOCS_PATH", "d:/Dev/repos/mcp-central-docs/src"
    )
    if MCP_CENTRAL_DOCS_PATH not in sys.path:
        sys.path.append(MCP_CENTRAL_DOCS_PATH)
    try:
        from docs_mcp.backend.rag_core import BaseVectorStore
    except ImportError:
        logger.error(
            "Could not import BaseVectorStore from docs_mcp. Ensure mcp-central-docs is accessible."
        )

        # Create a dummy class to prevent immediate crash if not running
        class BaseVectorStore:
            def __init__(self, *args, **kwargs):
                pass

            def search(self, *args, **kwargs):
                return []

            def add_documents(self, *args, **kwargs):
                pass


class OpenFangRAG(BaseVectorStore):
    """Semantic Search RAG wrapper for OpenFang Sovereign Substrate."""

    def __init__(
        self,
        db_path: str = "d:/Dev/repos/openfang/data/lancedb",
        table_name: str = "openfang_media",
    ):
        super().__init__(db_path=db_path, table_name=table_name)
        # Using a simple JSON file for delta sync tracking
        self.tracking_file = Path(db_path) / "sync_tracking.json"

        # Ensure parent dirs exist
        self.tracking_file.parent.mkdir(parents=True, exist_ok=True)

        if not self.tracking_file.exists():
            with open(self.tracking_file, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def _load_tracking(self) -> Dict[str, float]:
        with open(self.tracking_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_tracking(self, data: Dict[str, float]):
        with open(self.tracking_file, "w", encoding="utf-8") as f:
            json.dump(data, f)

    def retrieve_context(self, query: str, limit: int = 5) -> str:
        """Query the semantic memory and return formatted context."""
        try:
            results = self.search(query, limit=limit)
            if not results:
                return "No relevant context found in OpenFang RAG."

            formatted = []
            for r in results:
                content = r.get("content", "")
                source = r.get("source", "Unknown")
                formatted.append(f"Source: {source}\n{content}")

            return "\n\n---\n\n".join(formatted)
        except Exception as e:
            logger.error(f"Error during RAG retrieval: {e}")
            return f"Error retrieving semantic context: {e}"

    def delta_sync(self, documents: List[Dict[str, Any]]):
        """
        Only index new or modified documents.
        documents: List of dicts. Must have 'id', 'content', 'metadata', and optionally 'timestamp'.
        """
        tracking = self._load_tracking()
        to_index = []

        for doc in documents:
            doc_id = str(doc.get("id"))
            if not doc_id:
                continue

            doc_timestamp = doc.get("timestamp", 0)

            # Check if it needs indexing (new or updated)
            if doc_id not in tracking or tracking[doc_id] < doc_timestamp:
                to_index.append(doc)
                tracking[doc_id] = doc_timestamp

        if to_index:
            logger.info(
                f"Indexing {len(to_index)} new/updated documents into OpenFang RAG..."
            )
            # We use append mode to add new documents
            self.add_documents(to_index, overwrite=False)
            self._save_tracking(tracking)
        else:
            logger.info("No new documents to index via delta sync.")
