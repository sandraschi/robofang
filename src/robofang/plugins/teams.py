"""
Teams Connector for RoboFang.
[PHASE 6.5] Fleet Expansion bridge - NOT IMPLEMENTED.

Placeholder so plugin discovery finds the connector type. It never claims success:
connect() and send_message() return False until a real Teams integration exists.
"""

import logging
from typing import Any

from robofang.core.connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class TeamsConnector(BaseConnector):
    """Bridge for Microsoft Teams via Graph API or Webhooks."""

    connector_type = "teams"

    def __init__(self, name: str = "teams", config: dict[str, Any] | None = None):
        super().__init__(name, config or {})

    async def connect(self) -> bool:
        self.logger.warning("Teams connector is not implemented; staying disconnected.")
        self.active = False
        return False

    async def disconnect(self) -> bool:
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        self.logger.warning("Teams connector is not implemented; message to %s not sent.", target)
        return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        return []
