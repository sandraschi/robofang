"""
In-repo vector store for RoboFang RAG. No external dependency on docs_mcp or mcp-central-docs.
Uses LanceDB + fastembed for embeddings and semantic search.
"""

import logging
from pathlib import Path
from typing import Any

import lancedb
from fastembed import TextEmbedding

logger = logging.getLogger("robofang.core.rag_base")


class BaseVectorStore:
    """Manages document embeddings and retrieval using LanceDB. Wholly contained in this repo."""

    def __init__(
        self,
        db_path: str,
        table_name: str = "documents",
        embedding_model_name: str = "BAAI/bge-small-en-v1.5",
    ):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = lancedb.connect(str(self.db_path))
        self.embedding_model = TextEmbedding(model_name=embedding_model_name)
        self.table_name = table_name

    def add_documents(self, documents: list[dict[str, Any]], overwrite: bool = True) -> None:
        """
        Embed and index documents.
        documents: List of dicts with 'id', 'content', 'metadata'. Optional 'source'.
        """
        if not documents:
            return

        logger.info("Embedding %s items into '%s'...", len(documents), self.table_name)

        contents = [doc.get("content", "") for doc in documents]
        embeddings = list(self.embedding_model.embed(contents))

        data = []
        for doc, emb in zip(documents, embeddings):
            entry = {
                "id": doc.get("id"),
                "vector": emb.tolist(),
                "content": doc.get("content", ""),
                "metadata": doc.get("metadata", {}),
            }
            if "source" in doc:
                entry["source"] = doc["source"]
            data.append(entry)

        if overwrite or self.table_name not in self.db.table_names():
            self.db.create_table(self.table_name, data=data, mode="overwrite")
        else:
            tbl = self.db.open_table(self.table_name)
            tbl.add(data)

        logger.info("Indexed %s items into LanceDB table '%s'.", len(data), self.table_name)

    def search(
        self,
        query: str,
        limit: int = 5,
        where: str | None = None,
    ) -> list[dict[str, Any]]:
        """Semantic search. Returns list of dicts with vector, content, metadata, etc."""
        if self.table_name not in self.db.table_names():
            logger.warning("Table '%s' not found.", self.table_name)
            return []

        tbl = self.db.open_table(self.table_name)
        query_embedding = next(iter(self.embedding_model.embed([query])))
        search_req = tbl.search(query_embedding).limit(limit)
        if where:
            search_req = search_req.where(where)
        return search_req.to_arrow().to_pylist()
