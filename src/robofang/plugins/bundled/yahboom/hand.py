"""
YahboomHand: Secondary demonstrator bot for RoboFang.
Handles basic movement and connectivity demonstrations.
"""

import logging

from robofang.core.base_hand import Hand

logger = logging.getLogger("robofang.hands.yahboom")


class YahboomHand(Hand):
    """
    Entry-level robotic controller for Yahboom hardware.
    Used for simple A/V tasks and fleet heartbeat demonstrations.
    """

    async def pulse(self, orchestrator):
        logger.debug("[Yahboom] Pinging local controller...")
        orchestrator.memory.store("yahboom_signal", 92)
        orchestrator.memory.store("yahboom_activity", "Idle")
        await super().pulse(orchestrator)

    async def spin(self):
        """Simple actuation test."""
        logger.info("[Yahboom] Performing 360 spin.")
        return {"success": True}
