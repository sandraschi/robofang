"""Moltbook Connector."""

import logging
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class MoltbookConnector(BaseConnector):
    """Connector for the Moltbook sovereign journal system.

    config: api_key, base_url (optional)
    """

    connector_type = "moltbook"

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        import os

        from robofang.core.moltbook import MoltbookClient

        api_key = config.get("api_key") or os.getenv("MOLTBOOK_API_KEY")
        self._client = MoltbookClient(
            api_key=api_key,
            base_url=config.get("base_url", "https://www.moltbook.com/api/v1"),
        )

    async def connect(self) -> bool:
        result = await self._client.get("/feed")
        self.active = result.get("success", False)
        if self.active:
            self.logger.info("Moltbook connection verified.")
        else:
            self.logger.warning(f"Moltbook unreachable: {result.get('error')}")
        return self.active

    async def disconnect(self) -> bool:
        await self._client.close()
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        result = await self._client.post("/post", {"content": content, **kwargs})
        ok = result.get("success", False)
        if not ok:
            self.logger.warning(f"Moltbook post failed: {result.get('error')}")
        return ok

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        result = await self._client.get("/feed", params={"limit": str(limit)})
        if result.get("success"):
            data = result.get("data", {})
            return data.get("posts", data) if isinstance(data, dict) else data
        return []
