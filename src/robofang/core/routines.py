"""
Routines: user-defined scheduled actions (e.g. "dawn patrol 7am daily").
Stored in fleet_config; executed by RoutineRunner hand at wall-clock time.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

ROUTINES_KEY = "routines"


def _today_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def list_routines(storage: Any) -> List[Dict[str, Any]]:
    """Load routines from storage. Returns list of routine dicts."""
    out = storage.get_fleet_config(ROUTINES_KEY)
    if not out or not isinstance(out, list):
        return []
    return out


def save_routines(storage: Any, routines: List[Dict[str, Any]]) -> None:
    storage.set_fleet_config(ROUTINES_KEY, routines)


def create_routine(
    storage: Any,
    name: str,
    time_local: str,
    recurrence: str,
    action_type: str,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Append a routine and return it. time_local like '07:00', recurrence 'daily' or 'weekly'."""
    routines = list_routines(storage)
    rid = f"routine_{int(time.time() * 1000)}"
    routine = {
        "id": rid,
        "name": name,
        "time_local": time_local,
        "recurrence": recurrence,
        "action_type": action_type,
        "params": params or {},
        "last_run": None,
        "enabled": True,
    }
    routines.append(routine)
    save_routines(storage, routines)
    logger.info("Routine created: %s at %s %s (%s)", name, time_local, recurrence, action_type)
    return routine


def should_run_now(routine: Dict[str, Any]) -> bool:
    """True if current local time matches routine time and it has not run today."""
    if not routine.get("enabled", True):
        return False
    now = datetime.now()
    time_local = routine.get("time_local", "")
    if not time_local:
        return False
    try:
        h, m = time_local.strip().split(":")[:2]
        target_h, target_m = int(h), int(m)
    except (ValueError, IndexError):
        return False
    if now.hour != target_h or now.minute != target_m:
        return False
    today = _today_iso()
    if routine.get("last_run") == today:
        return False
    return True


def mark_run(storage: Any, routine_id: str) -> None:
    routines = list_routines(storage)
    for r in routines:
        if r.get("id") == routine_id:
            r["last_run"] = _today_iso()
            break
    save_routines(storage, routines)
