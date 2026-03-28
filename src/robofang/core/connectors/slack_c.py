"""Slack Connector."""

import logging
from typing import Any, Dict, List, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)


class SlackConnector(BaseConnector):
    """Connector for Slack via slack_sdk WebClient.

    config: token (or env SLACK_BOT_TOKEN), channel_id (default channel for send)
    Requires: pip install slack_sdk
    """

    connector_type = "slack"

    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self._client: Optional[Any] = None

    async def connect(self) -> bool:
        try:
            from slack_sdk.web.async_client import AsyncWebClient
        except ImportError:
            self.logger.error("slack_sdk not installed. pip install slack_sdk")
            return False
        import os

        token = self.config.get("token") or os.getenv("SLACK_BOT_TOKEN")
        if not token:
            self.logger.error("SlackConnector: no token.")
            return False
        self._client = AsyncWebClient(token=token)
        try:
            auth = await self._client.auth_test()
            if not auth.get("ok"):
                self.logger.error("Slack auth_test failed.")
                return False
            self.active = True
            self.logger.info("Slack connected: %s", auth.get("team"))
            return True
        except Exception as e:
            self.logger.error("Slack connect failed: %s", e)
            return False

    async def disconnect(self) -> bool:
        self._client = None
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        if not self._client or not self.active:
            return False
        channel = target or self.config.get("channel_id")
        if not channel:
            return False
        try:
            await self._client.chat_postMessage(channel=channel, text=content, **kwargs)
            return True
        except Exception as e:
            self.logger.error("Slack send_message error: %s", e)
            return False

    async def get_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        if not self._client or not self.active:
            return []
        channel_id = self.config.get("channel_id")
        if not channel_id:
            return []
        try:
            resp = await self._client.conversations_history(channel=channel_id, limit=limit)
            if not resp.get("ok"):
                return []
            return [
                {
                    "id": m.get("ts", ""),
                    "author": m.get("user", ""),
                    "content": m.get("text", ""),
                    "timestamp": m.get("ts", ""),
                }
                for m in (resp.get("messages") or [])
            ]
        except Exception as e:
            self.logger.error("Slack get_messages error: %s", e)
            return []
