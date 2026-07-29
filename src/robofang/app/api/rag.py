"""RAG REST endpoints — search the local LanceDB corpus."""

from fastapi import APIRouter, HTTPException

from robofang.core.state import orchestrator

router = APIRouter(prefix="/rag", tags=["rag"])


@router.get("/search")
async def rag_search(query: str, limit: int = 5):
    """Search the local LanceDB RAG corpus."""
    rag = getattr(orchestrator, "rag", None)
    if not rag:
        raise HTTPException(status_code=503, detail="Local RAG not available")
    try:
        results = rag.search(query, limit=limit)
        return {"success": True, "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/status")
async def rag_status():
    """RAG health and stats."""
    rag = getattr(orchestrator, "rag", None)
    if not rag:
        return {"success": True, "available": False, "reason": "Not initialised"}
    return {"success": True, "available": True, "db_path": str(rag.db_path), "table": rag.table_name}
