"""
WhatsApp Connector for RoboFang.
[PHASE 6.5] Fleet Expansion bridge.
"""

import logging
from robofang.core.plugins import BaseConnector

logger = logging.getLogger(__name__)


class WhatsAppConnector(BaseConnector):
    """Bridge for interacting with WhatsApp Business API or Web Gateway."""

    def __init__(self, config=None):
        super().__init__("whatsapp", config)
        self.logger = logging.getLogger("robofang.plugins.whatsapp")

    async def connect(self) -> bool:
        self.logger.info("Initializing WhatsApp session [MOCK]...")
        self.is_connected = True
        return True

    async def disconnect(self):
        self.logger.info("WhatsApp session terminated.")
        self.is_connected = False

    async def send_message(self, target: str, content: str):
        """Send a WhatsApp message (simulated)."""
        self.logger.info(f"WhatsApp: Sending message to {target} -> {content[:50]}...")
