"""RoboFang Fleet Events API: inbound alert sink for fleet producers.

Implements the fleet event contract that aiwatcher-mcp (alerting.py) and
other producers POST to:

    POST /api/v1/events
    {source, event, urgency, title, url, summary, tags, timestamp}

Events are persisted to the audit log; high-urgency events additionally
broadcast through configured channels (Discord/Telegram) via messaging.notify.
"""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from robofang.core.state import orchestrator
from robofang.messaging import notify

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Events"])


def _alert_threshold() -> float:
    try:
        return float(os.getenv("ROBOFANG_EVENT_ALERT_THRESHOLD", "8.0"))
    except ValueError:
        return 8.0


class FleetEvent(BaseModel):
    """Event payload shared with fleet producers (aiwatcher-mcp contract)."""

    source: str = "fleet"
    event: str = "FLEET_EVENT"
    urgency: float = Field(default=0.0, ge=0.0, le=10.0)
    title: str = ""
    url: str = ""
    summary: str = ""
    tags: list[str] = []
    timestamp: str = ""


@router.post("/events")
async def create_event(ev: FleetEvent):
    """Ingest a fleet alert: store it and broadcast when urgency is high."""
    details: dict[str, Any] = {
        "title": ev.title,
        "url": ev.url,
        "summary": ev.summary,
        "urgency": ev.urgency,
        "tags": ev.tags,
        "received_at": datetime.now(UTC).isoformat(),
    }
    level = "warning" if ev.urgency >= 7 else "info"
    event_id = orchestrator.storage.log_event(
        level,
        ev.source or "fleet",
        ev.event or "FLEET_EVENT",
        details,
    )
    notified = False
    if ev.urgency >= _alert_threshold() and ev.title:
        try:
            text = f"[{ev.source}] {ev.title}"
            if ev.url:
                text += f"\n{ev.url}"
            if ev.summary:
                text += f"\n{ev.summary[:300]}"
            await notify(text)
            notified = True
        except Exception as exc:
            logger.warning("Event notify failed: %s", exc)
    return {
        "success": True,
        "event_id": event_id,
        "stored": True,
        "notified": notified,
        "urgency": ev.urgency,
    }


@router.get("/events")
async def list_events(limit: int = 50):
    """List the most recent fleet events from the audit log."""
    try:
        logs = orchestrator.storage.get_audit_logs(limit=min(limit, 200))
        return {"success": True, "events": logs, "count": len(logs)}
    except Exception as exc:
        logger.exception("List events failed")
        return {"success": False, "error": str(exc)}
