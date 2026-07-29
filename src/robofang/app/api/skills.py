"""Skills REST endpoints — list and fetch skill content."""

import os
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/skills", tags=["skills"])
_skills_dir = Path(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))) / "skills"


@router.get("")
async def list_skills():
    """List available skills."""
    if not _skills_dir.exists():
        return {"skills": []}
    skills = []
    for d in _skills_dir.iterdir():
        if d.is_dir() and (d / "SKILL.md").exists():
            skills.append({"name": d.name, "uri": f"skill://{d.name}/SKILL.md"})
    return {"skills": skills}


@router.get("/{name}")
async def get_skill(name: str):
    """Return the SKILL.md content for a named skill."""
    skill_path = _skills_dir / name / "SKILL.md"
    if skill_path.exists():
        return PlainTextResponse(skill_path.read_text(encoding="utf-8"))
    return PlainTextResponse("not found", status_code=404)
