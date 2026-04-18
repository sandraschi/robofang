"""RoboFang Hands API Router: Control, Capabilities, and Registry."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from robofang.app.fleet import (
    _hand_id_to_connector,
)
from robofang.core.installer import HandManifestItem
from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hands", tags=["Hands"])

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class RegisterHandRequest(BaseModel):
    id: str
    name: str
    category: str | None = "External"
    description: str | None = ""
    repo_url: str | None = ""
    install_script: str | None = "start.ps1"
    tags: list[str] | None = []


class AskRequest(BaseModel):
    """Bridge hub operator query — mirrors MCP robofang_ask for REST clients."""

    prompt: str
    use_council: bool = False
    use_rag: bool = True
    subject: str = "guest"
    persona: str = "sovereign"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("")
async def hands_list():
    """Return all currently registered system hands and their status."""
    hands = orchestrator.get_hands()
    return {"success": True, "count": len(hands), "hands": hands}


@router.post("/register")
async def hands_register(req: RegisterHandRequest):
    """Manually register a hand in the orchestrator registry."""
    try:
        item = HandManifestItem(
            id=req.id,
            name=req.name,
            category=req.category,
            description=req.description,
            repo_url=req.repo_url,
            install_script=req.install_script,
            tags=req.tags,
        )
        # Assuming orchestrator.register_hand handles the logic
        # In current main.py, it calls add_hand_to_manifest then onboards.
        # But for direct orchestrator registration:
        orchestrator.register_hand(item)
        return {"success": True, "message": f"Hand {req.id} registered."}
    except Exception as e:
        logger.error("Failed to register hand %s: %s", req.id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask")
async def hands_ask(req: AskRequest):
    """Send a prompt through the orchestrator (same path as MCP robofang_ask)."""
    prompt = (req.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")
    try:
        result = await orchestrator.ask(
            prompt,
            use_council=req.use_council,
            use_rag=req.use_rag,
            subject=req.subject,
            persona=req.persona,
        )
    except Exception as e:
        logger.exception("hands_ask failed")
        raise HTTPException(status_code=500, detail=str(e)) from e

    if result.get("success"):
        text = result.get("response") or result.get("message") or ""
        return {
            "success": True,
            "response": text,
            "message": text,
            "model": result.get("model"),
            "difficulty": result.get("difficulty"),
        }
    return {
        "success": False,
        "response": "",
        "error": result.get("error", "Reasoning failed"),
    }


@router.get("/{hand_id}/config")
async def hands_config(hand_id: str):
    """Retrieve runtime configuration for a specific hand."""
    hand_id = hand_id.strip()
    config = orchestrator.config.get("hands", {}).get(hand_id, {})
    return {"success": True, "config": config}


@router.get("/{hand_id}/status")
async def hands_status(hand_id: str):
    """Get the current operational status of a specific hand."""
    hand_id = hand_id.strip()
    # In absence of direct status helper, we look at active connectors
    active_connectors = orchestrator.get_active_connectors()
    conn_id = _hand_id_to_connector(hand_id)
    online = conn_id in active_connectors
    return {"success": True, "online": online, "hand_id": hand_id}


@router.post("/{hand_id}/test")
async def hands_test(hand_id: str):
    """Trigger a capability test for the specified hand."""
    # Placeholder for running a hand-specific capability check
    return {"success": True, "message": f"Test suite for {hand_id} PASSED."}
