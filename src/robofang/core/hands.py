"""
RoboFang Hands System: Autonomous continuous processes & background scheduling.
[PHASE 9.1] HandsManager & Hand Base class (Mar 2026 Evolution).
"""

import asyncio
import importlib.util
import logging
import os
import time
from typing import Any

from robofang.core.base_hand import Hand
from robofang.core.hand_manifest import (
    load_hand_definition,
)

logger = logging.getLogger(__name__)


class HandsManager:
    """
    Orchestrates the lifecycle and scheduling of all RoboFang Hands.
    """

    def __init__(self, orchestrator: Any):
        self.orchestrator = orchestrator
        self.hands: dict[str, Hand] = {}
        self._loop_task: asyncio.Task | None = None
        self._background_tasks: set[asyncio.Task] = set()
        self.running = False

    def register_hand(self, hand: Hand):
        self.hands[hand.definition.id] = hand
        logger.info(f"Registered Hand: {hand.definition.name} ({hand.definition.id})")

    def load_hands_from_dir(self, directory: str):
        """Scan directory for HAND.toml files and register them."""
        if not os.path.exists(directory):
            logger.warning(f"Hands directory not found: {directory}")
            return

        for entry in os.scandir(directory):
            if entry.is_dir():
                toml_path = os.path.join(entry.path, "HAND.toml")
                if os.path.exists(toml_path):
                    try:
                        definition = load_hand_definition(toml_path)
                        # OpenFang-compatible: load SKILL.md from same dir if present
                        skill_path = os.path.join(entry.path, "SKILL.md")
                        if os.path.exists(skill_path):
                            try:
                                with open(skill_path, encoding="utf-8") as f:
                                    definition = definition.model_copy(update={"skill_content": f.read()})
                            except Exception as e:
                                logger.warning(f"Could not load SKILL.md for {definition.id}: {e}")

                        # Dynamic Factory Pattern: Check for hand.py in the same dir
                        implementation_path = os.path.join(entry.path, "hand.py")
                        hand = None

                        if os.path.exists(implementation_path):
                            try:
                                # Standard name for specialized class is {Id}Hand capitalized
                                class_name = f"{definition.id.capitalize()}Hand"
                                if definition.id == "pa":
                                    class_name = "PersonalAssistantHand"

                                spec = importlib.util.spec_from_file_location(
                                    f"rf_hand_{definition.id}", implementation_path
                                )
                                module = importlib.util.module_from_spec(spec)
                                spec.loader.exec_module(module)

                                hand_class = getattr(module, class_name, Hand)
                                hand = hand_class(definition)
                                logger.info(
                                    f"Loaded specialized implementation for {definition.id} from {implementation_path}"
                                )
                            except Exception as e:
                                logger.warning(
                                    f"Could not load specialized implementation for {definition.id}: {e}. "
                                    "Falling back to base Hand."
                                )

                        if not hand:
                            hand = Hand(definition)

                        self.register_hand(hand)
                    except Exception as e:
                        logger.error(f"Failed to load Hand from {toml_path}: {e}")

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
            for _hand_id, hand in self.hands.items():
                if hand.active:
                    # Check if it's time to pulse
                    if hand.next_run is None or now >= hand.next_run:
                        # We don't await here to avoid blocking other hands
                        task = asyncio.create_task(hand.pulse(self.orchestrator))
                        self._background_tasks.add(task)
                        task.add_done_callback(self._background_tasks.discard)

            await asyncio.sleep(10)  # Check every 10 seconds

    def get_hands_status(self) -> list[dict[str, Any]]:
        """Return a summary of all hands for the dashboard."""
        return [
            {
                "id": h.definition.id,
                "name": h.definition.name,
                "description": h.definition.description,
                "category": h.definition.category,
                "icon": h.definition.icon,
                "active": h.active,
                "last_run": h.last_run,
                "next_run": h.next_run,
                "metrics": self._get_hand_metrics(h),
            }
            for h in self.hands.values()
        ]

    def _get_hand_metrics(self, hand: Hand) -> dict[str, Any]:
        """Fetch metrics defined in hand.dashboard.metrics from orchestrator memory."""
        metrics = {}
        for m in hand.definition.dashboard.metrics:
            # Placeholder: fetch from orchestrator's memory/knowledge system
            val = self.orchestrator.memory.recall(m.memory_key) if hasattr(self.orchestrator, "memory") else 0
            metrics[m.label] = val or 0
        return metrics
