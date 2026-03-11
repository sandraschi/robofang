"""
RoboFang/webhooks.py
====================
Webhook listeners for external signals.
Triggers re-scans, alerts, and HRI reactions.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from robofang.messaging import notify

logger = logging.getLogger("ROBOFANG_webhooks")
router = APIRouter(prefix="/hooks")


class WebhookPayload(BaseModel):
    event: str
    data: Optional[dict] = None
    secret: Optional[str] = None


@router.post("/repo")
async def hook_repo_lifecycle(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """Triggered by local file watchers or Git hooks."""
    logger.info(f"Repo lifecycle hook triggered: {payload.event}")
    # In a real scenario, this would trigger a re-scan or update
    # For now, we broadcast the event
    background_tasks.add_task(notify, f"🔄 Repo Lifecycle Event: **{payload.event}**")
    return {"success": True, "action": "acknowledged"}


@router.post("/council")
async def hook_council_wake(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """Urgent wake signal for the council."""
    logger.info("Council wake hook triggered")
    msg = f"⚖️ **Council Wake Requested**: {payload.data.get('reason', 'No reason provided')}"
    background_tasks.add_task(notify, msg)
    return {"success": True, "action": "waking council"}


@router.post("/hri")
async def hook_hri_proximity(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """Proximity alert from virtual or physical robots."""
    logger.info("HRI proximity hook triggered")
    user = payload.data.get("user", "Unknown User")
    background_tasks.add_task(notify, f"👤 **HRI Proximity Alert**: User `{user}` detected.")
    return {"success": True, "action": "logged"}


@router.post("/audit")
async def hook_audit_signoff(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """Capture approval for high-risk operations."""
    logger.info("Audit sign-off hook triggered")
    op_id = payload.data.get("operation_id", "Unknown")
    status = payload.data.get("status", "pending")
    background_tasks.add_task(
        notify, f"🗳️ **Audit Sign-off**: Op `{op_id}` status set to `{status}`."
    )
    return {"success": True, "action": "recorded"}
