"""BaseVectorStore against a real LanceDB (tmp dir) with a fake embedder - no model download."""

import lancedb
import numpy as np

from robofang.core.rag_base import BaseVectorStore


class _FakeEmbedder:
    """Deterministic 4-dim embedding: first letter decides the direction."""

    def embed(self, texts):
        for t in texts:
            v = np.zeros(4, dtype=np.float32)
            v[ord((t or "a")[0].lower()) % 4] = 1.0
            yield v


def _store(tmp_path) -> BaseVectorStore:
    store = BaseVectorStore.__new__(BaseVectorStore)
    store.db_path = tmp_path / "db"
    store.db = lancedb.connect(str(store.db_path))
    store.embedding_model = _FakeEmbedder()  # type: ignore[assignment]
    store.embed_device = "cpu"
    store.embed_batch_size = 8
    store.table_name = "documents"
    return store


def _docs(*contents: str) -> list[dict]:
    return [{"id": c, "content": c, "metadata": {"k": "v"}} for c in contents]


def test_search_finds_indexed_documents(tmp_path):
    store = _store(tmp_path)
    store.add_documents(_docs("alpha", "bravo", "charlie"))
    hits = store.search("alpha", limit=1)
    assert [h["content"] for h in hits] == ["alpha"]


def test_search_without_table_returns_empty(tmp_path):
    assert _store(tmp_path).search("anything") == []


def test_add_without_overwrite_appends(tmp_path):
    store = _store(tmp_path)
    store.add_documents(_docs("alpha"))
    store.add_documents(_docs("bravo"), overwrite=False)
    assert sorted(h["content"] for h in store.search("x", limit=10)) == ["alpha", "bravo"]
