"""
RoutineRunner Hand: runs user routines at wall-clock time (e.g. dawn patrol 7am daily).
Pulses every 60s and triggers any routine whose time matches and has not run today.
"""

import logging
from typing import Any

from robofang.core.base_hand import Hand

logger = logging.getLogger(__name__)


class RoutineRunnerHand(Hand):
    """Runs stored routines at their scheduled local time."""

    def __init__(self, definition: Any):
        super().__init__(definition)
        self.pulse_interval = 60  # check every minute for 7am etc.

    async def _on_pulse(self, orchestrator: Any):
        routines = orchestrator.list_routines()
        for routine in routines:
            if not orchestrator.routine_should_run_now(routine):
                continue
            rid = routine.get("id")
            name = routine.get("name", rid)
            logger.info("Routine due: %s (%s), triggering.", name, rid)
            try:
                result = await orchestrator.run_routine(rid)
                if result.get("success"):
                    logger.info("Routine %s completed.", name)
                else:
                    logger.warning("Routine %s failed: %s", name, result.get("error"))
            except Exception as e:
                logger.exception("Routine %s error: %s", name, e)
