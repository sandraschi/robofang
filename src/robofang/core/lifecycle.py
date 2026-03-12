import asyncio
import logging
import time
from typing import Any, Dict, Optional, Set

logger = logging.getLogger(__name__)


class LifecycleManager:
    """Manages the slumber and wakeup cycles of MCP servers (Hands) to conserve resources."""

    def __init__(self, orchestrator: Any, ttl_seconds: int = 1800):
        self.orchestrator = orchestrator
        self.ttl_seconds = ttl_seconds
        self.last_used: Dict[str, float] = {}
        self.locked_hands: Set[str] = set()  # Hands that shouldn't be auto-slumbered
        self._monitor_task: Optional[asyncio.Task] = None
        self.running = False

    def record_usage(self, hand_id: str):
        """Record the current time as the last use of a hand."""
        self.last_used[hand_id] = time.time()
        logger.debug(f"Recorded usage for hand '{hand_id}'")

    async def start(self):
        """Start the lifecycle monitoring loop."""
        if self.running:
            return
        self.running = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("Lifecycle Manager started.")

    async def stop(self):
        """Stop the lifecycle monitoring loop."""
        self.running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Lifecycle Manager stopped.")

    async def _monitor_loop(self):
        """Periodically check for idle hands to slumber."""
        while self.running:
            try:
                await asyncio.sleep(60)  # Check every minute
                await self.check_slumber()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in lifecycle monitor loop: {e}")

    async def check_slumber(self):
        """Identifies and shuts down idle hands."""
        now = time.time()
        for hand_id, last_time in list(self.last_used.items()):
            if hand_id in self.locked_hands:
                continue

            if now - last_time > self.ttl_seconds:
                # Get the hand instance from HandsManager
                hand = self.orchestrator.hands.hands.get(hand_id)
                if hand and hand.active:
                    logger.info(
                        f"Hand '{hand_id}' idle for >{self.ttl_seconds}s. Initiating slumber."
                    )
                    await self.slumber(hand_id)

    async def slumber(self, hand_id: str):
        """Shut down a hand by pausing it."""
        try:
            hand = self.orchestrator.hands.hands.get(hand_id)
            if hand:
                # Hand in HandsManager has pause()
                hand.pause()
                if hand_id in self.last_used:
                    del self.last_used[hand_id]
                logger.info(f"Hand '{hand_id}' is now in slumber.")
        except Exception as e:
            logger.error(f"Failed to slumber {hand_id}: {e}")

    async def wakeup(self, hand_id: str):
        """Seamlessly restart a slumbering hand."""
        logger.info(f"Waking up hand '{hand_id}'...")
        try:
            hand = self.orchestrator.hands.hands.get(hand_id)
            if hand:
                # Hand in HandsManager has activate()
                hand.activate()
                self.record_usage(hand_id)
                logger.info(f"Hand '{hand_id}' waked up successfully.")
            else:
                logger.warning(f"Attempted to wakeup non-existent hand: {hand_id}")
        except Exception as e:
            logger.error(f"Failed to wakeup {hand_id}: {e}")
