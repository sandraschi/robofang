"""
RoboFang Hands System: Autonomous continuous processes & background scheduling.
[PHASE 9.1] HandsManager & Hand Base class (Mar 2026 Evolution).
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class HandManifest:
    id: str
    name: str
    description: str
    version: str = "1.0.0"
    author: str = "RoboFang Core"
    tags: List[str] = field(default_factory=list)


class Hand:
    """
    Base class for an autonomous agentic process (a "Hand").
    """

    def __init__(self, manifest: HandManifest):
        self.manifest = manifest
        self.active = False
        self.last_run: Optional[float] = None
        self.next_run: Optional[float] = None
        self.pulse_interval = 300  # Default 5 minutes
        self.state: Dict[str, Any] = {}
        self.logger = logging.getLogger(f"robofang.hands.{self.manifest.id}")

    async def pulse(self, orchestrator: Any):
        """Perform one autonomous pulse."""
        if not self.active:
            return

        self.logger.debug(f"Hand '{self.manifest.id}' pulsing...")
        try:
            await self._on_pulse(orchestrator)
            self.last_run = time.time()
            self.next_run = self.last_run + self.pulse_interval
        except Exception as e:
            self.logger.error(f"Hand '{self.manifest.id}' pulse failed: {e}")

    async def _on_pulse(self, orchestrator: Any):
        """Override in subclasses to implement logic."""
        raise NotImplementedError("Subclasses must implement _on_pulse")

    def activate(self):
        self.active = True
        self.logger.info(f"Hand '{self.manifest.id}' activated.")

    def pause(self):
        self.active = False
        self.logger.info(f"Hand '{self.manifest.id}' paused.")


class HandsManager:
    """
    Orchestrates the lifecycle and scheduling of all RoboFang Hands.
    """

    def __init__(self, orchestrator: Any):
        self.orchestrator = orchestrator
        self.hands: Dict[str, Hand] = {}
        self._loop_task: Optional[asyncio.Task] = None
        self.running = False

    def register_hand(self, hand: Hand):
        self.hands[hand.manifest.id] = hand
        logger.info(f"Registered Hand: {hand.manifest.name} ({hand.manifest.id})")

    async def start(self):
        """Start the autonomous loop."""
        if self.running:
            return

        self.running = True
        self._loop_task = asyncio.create_task(self._autonomous_loop())
        logger.info("Autonomous Hands Loop started.")

    async def stop(self):
        """Stop the autonomous loop."""
        self.running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        logger.info("Autonomous Hands Loop stopped.")

    async def _autonomous_loop(self):
        """The core heartbeat for all active hands."""
        while self.running:
            now = time.time()
            for hand_id, hand in self.hands.items():
                if hand.active:
                    # Check if it's time to pulse
                    if hand.next_run is None or now >= hand.next_run:
                        # We don't await here to avoid blocking other hands
                        asyncio.create_task(hand.pulse(self.orchestrator))

            await asyncio.sleep(10)  # Check every 10 seconds

    def get_hands_status(self) -> List[Dict[str, Any]]:
        """Return a summary of all hands for the dashboard."""
        return [
            {
                "id": h.manifest.id,
                "name": h.manifest.name,
                "description": h.manifest.description,
                "active": h.active,
                "last_run": h.last_run,
                "next_run": h.next_run,
                "tags": h.manifest.tags,
            }
            for h in self.hands.values()
        ]
