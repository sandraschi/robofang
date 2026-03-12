import os
import sys

import pytest

from robofang.core.robofang_rag import RoboFangRAG

# Add mcp-central-docs to path to ensure tests pass
MCP_CENTRAL_DOCS_PATH = os.environ.get("MCP_CENTRAL_DOCS_PATH", "d:/Dev/repos/mcp-central-docs/src")
if MCP_CENTRAL_DOCS_PATH not in sys.path:
    sys.path.append(MCP_CENTRAL_DOCS_PATH)

# Add robofang to path


@pytest.fixture
def temp_rag(tmp_path):
    # Use a temporary directory for LanceDB and tracking JSON
    db_path = str(tmp_path / "lancedb")
    rag = RoboFangRAG(db_path=db_path, table_name="test_media")
    return rag, tmp_path


def test_rag_initialization(temp_rag):
    _rag, tmp_path = temp_rag
    assert (tmp_path / "lancedb").exists()
    assert (tmp_path / "lancedb" / "sync_tracking.json").exists()


def test_delta_sync(temp_rag):
    rag, _tmp_path = temp_rag

    docs = [
        {
            "id": "1",
            "content": "Test document 1",
            "metadata": {"title": "Doc 1"},
            "timestamp": 100,
        },
        {
            "id": "2",
            "content": "Test document 2",
            "metadata": {"title": "Doc 2"},
            "timestamp": 100,
        },
    ]

    # First sync should add both
    rag.delta_sync(docs)
    tracking = rag._load_tracking()
    assert "1" in tracking
    assert "2" in tracking
    assert tracking["1"] == 100

    # Second sync with same docs should skip
    rag.delta_sync(docs)

    # Update doc 1
    docs[0]["timestamp"] = 200
    docs[0]["content"] = "Updated document 1"

    rag.delta_sync(docs)
    tracking = rag._load_tracking()
    assert tracking["1"] == 200

    # Search to ensure they were indexed
    results = rag.search("Test document")
    assert len(results) > 0
