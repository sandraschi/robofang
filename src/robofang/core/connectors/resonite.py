"""Resonite Connector."""

import logging
from typing import Any, Dict, List

from .base import BaseConnector

logger = logging.getLogger(__name__)


class ResoniteConnector(BaseConnector):
    """Connector for Resonite worlds via ResoniteLink WebSocket.

    config: host (default localhost), port (default 4242)
    """

    connector_type = "resonite"

    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        from robofang.core.resonite_link import ResoniteLinkClient

        self.client = ResoniteLinkClient(
            host=config.get("host", "localhost"), port=config.get("port", 4242)
        )

    async def connect(self) -> bool:
        ok = await self.client.connect()
        self.active = ok
        return ok

    async def disconnect(self) -> bool:
        await self.client.disconnect()
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        if target == "spawn":
            return await self.client.spawn_object(
                template_url=content,
                position=kwargs.get("position", {"x": 0, "y": 0, "z": 0}),
            )
        return await self.client.set_component_value(
            component_id=target,
            field=kwargs.get("field", "Value"),
            value=content,
        )

    async def get_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        return []  # requires caching from the _listen loop
