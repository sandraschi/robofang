"""Inbox message processing: schedule phrases or general commands."""

from __future__ import annotations

import json
import logging

from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)


async def process_inbox_message(message: str) -> str:
    """
    Process one inbound message. Tries to create a routine from phrase; else runs ask().
    Returns reply text for the user.
    """
    message = (message or "").strip()
    if not message:
        return "No message received."
    prompt = (
        "Extract a scheduled routine from this user message. Reply with ONLY a JSON object, no markdown.\n"
        "Fields: name (short label), time_local (HH:MM 24h), recurrence (daily|weekly), "
        "action_type (use 'dawn_patrol' for patrol with video and report, or 'general' if not a schedule).\n"
        "If the message is NOT about scheduling a recurring task, set action_type to 'general' and omit time_local.\n"
        'Example schedule: {"name": "dawn patrol", "time_local": "07:00", '
        '"recurrence": "daily", "action_type": "dawn_patrol"}\n'
        f"User message: {message}"
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
            raise ValueError(result.get("error", "Parse failed"))
        raw = result.get("response", "").strip()
        for start in ("{", "```json"):
            if start in raw:
                raw = raw[raw.index(start) :]
                break
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
        data = json.loads(raw)
        action_type = (data.get("action_type") or "").strip().lower()
        if action_type and action_type != "general" and data.get("time_local"):
            name = data.get("name") or "routine"
            time_local = data.get("time_local") or "07:00"
            recurrence = data.get("recurrence") or "daily"
            orchestrator.create_routine(
                name=name,
                time_local=time_local,
                recurrence=recurrence,
                action_type=action_type or "dawn_patrol",
                params={},
            )
            return (
                f"Scheduled: {name} at {time_local} {recurrence}. "
                "Activate the Routine Runner on the Schedule page if needed."
            )
    except (json.JSONDecodeError, ValueError, KeyError):
        pass
    except Exception as e:
        logger.debug("Inbox routine parse skipped: %s", e)
    try:
        result = await orchestrator.ask(
            message,
            use_council=False,
            use_rag=True,
            subject="guest",
            persona="sovereign",
        )
        if result.get("success"):
            return result.get("response", "") or "Done."
        return result.get("error", "Command failed.") or "Command failed."
    except Exception as e:
        logger.exception("Inbox ask failed")
        return f"Error: {e}"
