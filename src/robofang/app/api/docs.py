"""RoboFang Docs API Router: Accessing system documentation and guides."""

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/docs", tags=["Docs"])

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("")
async def docs_list():
    """List all available documentation files (markdown)."""
    # Assuming standard docs directory
    docs_dir = Path("D:/Dev/repos/robofang/docs")
    if not docs_dir.exists():
        return {"success": True, "docs": [], "message": "Docs directory missing."}

    docs = []
    for f in docs_dir.glob("*.md"):
        docs.append(
            {
                "slug": f.stem,
                "title": f.stem.replace("_", " ").replace("-", " ").title(),
                "path": str(f),
            }
        )
    return {"success": True, "docs": docs}


@router.get("/{slug}")
async def get_doc(slug: str):
    """Fetch and return the content of a specific documentation file."""
    doc_path = Path(f"D:/Dev/repos/robofang/docs/{slug}.md")
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Documentation not found: {slug}")

    try:
        content = doc_path.read_text(encoding="utf-8")
        return {
            "success": True,
            "slug": slug,
            "title": slug.replace("_", " ").replace("-", " ").title(),
            "content": content,
        }
    except Exception as e:
        logger.error(f"Failed to read doc {slug}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
