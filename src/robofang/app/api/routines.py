"""Routines API: scheduled chains (dawn patrol, etc.)."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/routines", tags=["Routines"])


class RoutineFromPhraseRequest(BaseModel):
    phrase: str
    report_email: str | None = None
    run_now: bool | None = False


class RoutineUpdateRequest(BaseModel):
    name: str | None = None
    time_local: str | None = None
    recurrence: str | None = None
    action_type: str | None = None
    params: dict[str, Any] | None = None
    enabled: bool | None = None


@router.get("")
async def list_routines():
    return {"success": True, "routines": orchestrator.list_routines()}


@router.post("/from-phrase")
async def routines_from_phrase(req: RoutineFromPhraseRequest):
    prompt = (
        "Extract a scheduled routine from this user message. Reply with ONLY a JSON object, no markdown.\n"
        "Fields: name (short label), time_local (HH:MM 24h), recurrence (daily|weekly), "
        "action_type (use 'dawn_patrol' for patrol with video and report).\n"
        'Example: {"name": "dawn patrol", "time_local": "07:00", "recurrence": "daily", "action_type": "dawn_patrol"}\n'
        f"User message: {req.phrase}"
    )
    try:
        result = await orchestrator.ask(
            prompt,
            use_council=False,
            use_rag=False,
            subject="guest",
            persona="sovereign",
        )
        if not result.get("success"):
            return {"success": False, "error": result.get("error", "Parse failed")}
        raw = result.get("response", "").strip()
        for start in ("{", "```json"):
            if start in raw:
                raw = raw[raw.index(start) :]
                break
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
        data = json.loads(raw)
        name = data.get("name") or "routine"
        time_local = data.get("time_local") or "07:00"
        recurrence = data.get("recurrence") or "daily"
        action_type = data.get("action_type") or "dawn_patrol"
        params: dict[str, Any] = {}
        if req.report_email:
            params["report_email"] = req.report_email
        routine = orchestrator.create_routine(
            name=name,
            time_local=time_local,
            recurrence=recurrence,
            action_type=action_type,
            params=params,
        )
        if req.run_now:
            run_result = await orchestrator.run_routine(routine["id"])
            return {"success": True, "routine": routine, "run_result": run_result}
        return {"success": True, "routine": routine}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Could not parse LLM response as JSON: {e}"}
    except Exception as e:
        logger.exception("Routines from-phrase failed")
        return {"success": False, "error": str(e)}


@router.get("/{routine_id}")
async def get_routine(routine_id: str):
    routine = orchestrator.get_routine(routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail=f"Routine {routine_id} not found")
    return {"success": True, "routine": routine}


@router.patch("/{routine_id}")
async def update_routine(routine_id: str, req: RoutineUpdateRequest):
    routine = orchestrator.update_routine(
        routine_id,
        name=req.name,
        time_local=req.time_local,
        recurrence=req.recurrence,
        action_type=req.action_type,
        params=req.params,
        enabled=req.enabled,
    )
    if not routine:
        raise HTTPException(status_code=404, detail=f"Routine {routine_id} not found")
    return {"success": True, "routine": routine}


@router.delete("/{routine_id}")
async def delete_routine(routine_id: str):
    if not orchestrator.delete_routine(routine_id):
        raise HTTPException(status_code=404, detail=f"Routine {routine_id} not found")
    return {"success": True}


@router.post("/{routine_id}/run")
async def run_routine(routine_id: str):
    result = await orchestrator.run_routine(routine_id)
    return result
