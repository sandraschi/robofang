"""Plex Connector."""

import asyncio
import logging
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class PlexConnector(BaseConnector):
    """Connector for Plex Media Server via plexapi.

    config:
      url   — e.g. "http://localhost:32400"
      token — Plex X-Plex-Token
    """

    connector_type = "plex"

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        import os

        self._url = config.get("url") or os.getenv("PLEX_URL", "http://localhost:32400")
        self._token = config.get("token") or os.getenv("PLEX_TOKEN", "")
        self._server: Any | None = None

    async def connect(self) -> bool:
        try:
            from plexapi.server import PlexServer
        except ImportError:
            self.logger.error("plexapi not installed. pip install plexapi")
            return False
        loop = asyncio.get_running_loop()
        try:
            self._server = await loop.run_in_executor(None, lambda: PlexServer(self._url, self._token))
            self.logger.info(f"Plex connected: {self._server.friendlyName}")
            self.active = True
            return True
        except Exception as e:
            self.logger.error(f"Plex connection failed: {e}")
            return False

    async def disconnect(self) -> bool:
        self._server = None
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Control Plex playback.

        target  — client name (e.g. "Living Room TV") or "all"
        content — "play" | "pause" | "stop" | "search:QUERY"
        """
        if not self._server:
            return False
        loop = asyncio.get_running_loop()
        cmd = content.strip().lower()

        def _control():
            clients = self._server.clients()
            targets = clients if target == "all" else [c for c in clients if c.title == target]
            if not targets:
                return False
            for client in targets:
                if cmd == "play":
                    client.play()
                elif cmd == "pause":
                    client.pause()
                elif cmd == "stop":
                    client.stop()
                else:
                    return False
            return True

        try:
            return await loop.run_in_executor(None, _control)
        except Exception as e:
            self.logger.error(f"Plex control error: {e}")
            return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return recently added media items."""
        if not self._server:
            return []
        loop = asyncio.get_running_loop()
        try:

            def _recent():
                items = []
                for section in self._server.library.sections():
                    for item in section.recentlyAdded(maxresults=limit // max(1, len(self._server.library.sections()))):
                        items.append(
                            {
                                "title": item.title,
                                "type": item.type,
                                "section": section.title,
                                "added_at": str(item.addedAt),
                                "year": getattr(item, "year", None),
                            }
                        )
                return sorted(items, key=lambda i: i["added_at"], reverse=True)[:limit]

            return await loop.run_in_executor(None, _recent)
        except Exception as e:
            self.logger.error(f"Plex get_messages error: {e}")
            return []
