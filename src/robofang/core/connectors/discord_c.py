"""Discord Connector."""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)


class DiscordConnector(BaseConnector):
    """Connector for Discord via discord.py async bot.

    config: token, channel_id (int)
    """

    connector_type = "discord"

    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self._client: Optional[Any] = None
        self._bot_task: Optional[asyncio.Task] = None
        self._ready = asyncio.Event()

    async def connect(self) -> bool:
        try:
            import discord
        except ImportError:
            self.logger.error("discord.py not installed. pip install discord.py")
            return False
        import os

        token = self.config.get("token") or os.getenv("DISCORD_BOT_TOKEN")
        if not token:
            self.logger.error("DiscordConnector: no token.")
            return False
        intents = discord.Intents.default()
        intents.message_content = True
        client = discord.Client(intents=intents)
        self._client = client
        self._ready.clear()

        @client.event
        async def on_ready():
            self.logger.info(f"Discord bot ready: {client.user}")
            self.active = True
            self._ready.set()

        self._bot_task = asyncio.create_task(client.start(token))
        try:
            await asyncio.wait_for(self._ready.wait(), timeout=15.0)
        except asyncio.TimeoutError:
            self.logger.warning("Discord bot did not become ready within 15s.")
            return False
        return self.active

    async def disconnect(self) -> bool:
        if self._client:
            await self._client.close()
        if self._bot_task:
            self._bot_task.cancel()
            try:
                await self._bot_task
            except (asyncio.CancelledError, Exception):
                pass
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        if not self._client or not self.active:
            return False
        channel_id = int(target) if target != "default" else self.config.get("channel_id")
        if not channel_id:
            return False
        try:
            channel = self._client.get_channel(channel_id) or await self._client.fetch_channel(
                channel_id
            )
            await channel.send(content)
            return True
        except Exception as e:
            self.logger.error(f"Discord send error: {e}")
            return False

    async def get_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        if not self._client or not self.active:
            return []
        channel_id = self.config.get("channel_id")
        if not channel_id:
            return []
        try:
            channel = self._client.get_channel(int(channel_id)) or await self._client.fetch_channel(
                int(channel_id)
            )
            return [
                {
                    "id": str(m.id),
                    "author": str(m.author),
                    "content": m.content,
                    "timestamp": m.created_at.isoformat(),
                }
                async for m in channel.history(limit=limit)
            ]
        except Exception as e:
            self.logger.error(f"Discord get_messages error: {e}")
            return []
