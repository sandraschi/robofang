"""RoboFang Docs API Router: Accessing system documentation and guides."""

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/docs", tags=["Docs"])


def _docs_dir() -> Path:
    """Resolve the docs directory relative to the package, not a hardcoded path."""
    # src/robofang/app/api/docs.py -> repo root is parents[4]
    return Path(__file__).resolve().parents[4] / "docs"


def _safe_doc_path(slug: str) -> Path:
    """Resolve a doc slug to a path inside docs/, rejecting traversal."""
    docs_dir = _docs_dir().resolve()
    candidate = (docs_dir / f"{slug}.md").resolve()
    if not candidate.is_relative_to(docs_dir):
        raise HTTPException(status_code=400, detail="Invalid documentation slug.")
    return candidate


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("")
async def docs_list():
    """List all available documentation files (markdown)."""
    docs_dir = _docs_dir()
    if not docs_dir.exists():
        return {"success": True, "docs": [], "message": "Docs directory missing."}

    docs = [
        {
            "slug": f.stem,
            "title": f.stem.replace("_", " ").replace("-", " ").title(),
            "path": str(f),
        }
        for f in docs_dir.glob("*.md")
    ]
    return {"success": True, "docs": docs}


@router.get("/{slug}")
async def get_doc(slug: str):
    """Fetch and return the content of a specific documentation file."""
    doc_path = _safe_doc_path(slug)
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Documentation not found: {slug}")

    try:
        content = doc_path.read_text(encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to read doc {slug}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    return {
        "success": True,
        "slug": slug,
        "title": slug.replace("_", " ").replace("-", " ").title(),
        "content": content,
    }
