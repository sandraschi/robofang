"""
RoboFang Base Hand: Core abstractions for autonomous processes.
"""

import logging
from typing import Any

from robofang.core.hand_manifest import (
    HandDefinition,
    resolve_hand_settings,
)

logger = logging.getLogger(__name__)


class Hand:
    """
    Base class for an autonomous agentic process (a "Hand").
    """

    def __init__(self, definition: HandDefinition, config: dict[str, Any] | None = None):
        self.definition = definition
        self.active = False
        self.last_run: float | None = None
        self.next_run: float | None = None
        self.pulse_interval = 300  # Default 5 minutes
        self.config = config or {}
        self.state: dict[str, Any] = {}
        self.logger = logging.getLogger(f"robofang.hands.{self.definition.id}")

        # Resolve settings to get prompt block and env vars
        resolved = resolve_hand_settings(self.definition.settings, self.config)
        self.prompt_block = resolved["prompt_block"]
        self.env_vars = resolved["env_vars"]

    async def pulse(self, orchestrator: Any):
        """Perform one autonomous pulse."""
        if not self.active:
            return

        self.logger.debug(f"Hand '{self.definition.id}' pulsing...")
        try:
            await self._on_pulse(orchestrator)
            import time

            self.last_run = time.time()
            self.next_run = self.last_run + self.pulse_interval
        except Exception as e:
            self.logger.error(f"Hand '{self.definition.id}' pulse failed: {e}")

    async def _on_pulse(self, orchestrator: Any):
        """Override in subclasses to implement logic."""
        pass

    def activate(self):
        self.active = True
        self.logger.info(f"Hand '{self.definition.id}' activated.")

    def pause(self):
        self.active = False
        self.logger.info(f"Hand '{self.definition.id}' paused.")
