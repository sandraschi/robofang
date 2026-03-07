"""
RustDesk Connector for OpenFang.
[PHASE 6.5] Fleet Expansion bridge.
"""

import logging
from openfang.core.plugins import BaseConnector

logger = logging.getLogger(__name__)


class RustDeskConnector(BaseConnector):
    """Bridge for RustDesk remote desktop coordination."""

    def __init__(self, config=None):
        super().__init__("rustdesk", config)
        self.logger = logging.getLogger("openfang.plugins.rustdesk")

    async def connect(self) -> bool:
        self.logger.info("Connecting to RustDesk relay server [MOCK]...")
        self.is_connected = True
        return True

    async def disconnect(self):
        self.logger.info("RustDesk connection closed.")
        self.is_connected = False

    async def send_message(self, target: str, content: str):
        """Send control or notification data to RustDesk client (simulated)."""
        self.logger.info(f"RustDesk: Sending data to {target} -> {content[:50]}...")
