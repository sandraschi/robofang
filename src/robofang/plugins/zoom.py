"""
Zoom Connector for RoboFang.
[PHASE 6.5] Fleet Expansion bridge - NOT IMPLEMENTED.

Placeholder so plugin discovery finds the connector type. It never claims success:
connect() and send_message() return False until a real Zoom integration exists.
"""

import logging
from typing import Any

from robofang.core.connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class ZoomConnector(BaseConnector):
    """Bridge for Zoom Chat and Meeting interaction."""

    connector_type = "zoom"

    def __init__(self, name: str = "zoom", config: dict[str, Any] | None = None):
        super().__init__(name, config or {})

    async def connect(self) -> bool:
        self.logger.warning("Zoom connector is not implemented; staying disconnected.")
        self.active = False
        return False

    async def disconnect(self) -> bool:
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        self.logger.warning("Zoom connector is not implemented; message to %s not sent.", target)
        return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        return []
