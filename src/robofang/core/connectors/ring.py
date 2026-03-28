"""Ring Connector."""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)


class RingConnector(BaseConnector):
    """Connector for Ring doorbells and cameras.

    Uses the ring_doorbell library. Token cached in ring_token.cache.
    config:
      email      — Ring account email
      password   — Ring account password
      token_file — path to token cache (default: ring_token.cache)
    """

    connector_type = "ring"

    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self._ring: Optional[Any] = None

    async def connect(self) -> bool:
        try:
            from ring_doorbell import Auth, Ring
        except ImportError:
            self.logger.error("ring_doorbell not installed. pip install ring_doorbell")
            return False
        import os

        email = self.config.get("email", "")
        password = self.config.get("password", "")
        token_file = self.config.get("token_file", "ring_token.cache")
        loop = asyncio.get_running_loop()

        def _connect():
            token_data = None
            if os.path.exists(token_file):
                try:
                    import json as _j

                    token_data = _j.loads(open(token_file).read())
                except Exception:
                    pass
            auth = Auth(
                "RoboFang/1.0",
                token_data,
                lambda t: open(token_file, "w").write(str(t)),
            )
            if not token_data:
                auth.fetch_token(email, password)
            r = Ring(auth)
            r.update_data()
            return r

        try:
            self._ring = await loop.run_in_executor(None, _connect)
            devices = self._ring.devices()
            count = sum(len(v) for v in devices.values())
            self.logger.info(f"Ring connected. Devices: {count}")
            self.active = True
            return True
        except Exception as e:
            self.logger.error(f"Ring connection failed: {e}")
            return False

    async def disconnect(self) -> bool:
        self._ring = None
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Trigger a Ring action.

        target  — device name or "all"
        content — "snapshot" | "live_stream_url"
        """
        if not self._ring:
            return False
        self.logger.info(f"Ring: {content} on {target} (read-only API, no actuation)")
        # Ring API is mostly read-only (no remote relay triggers via ring_doorbell lib)
        return False

    async def get_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return recent motion/doorbell events."""
        if not self._ring:
            return []
        loop = asyncio.get_running_loop()
        try:

            def _events():
                results = []
                for device in self._ring.video_doorbells + self._ring.stickup_cams:
                    for event in device.history(
                        limit=limit
                        // max(1, len(self._ring.video_doorbells + self._ring.stickup_cams))
                    ):
                        results.append(
                            {
                                "device": device.name,
                                "kind": event.get("kind"),
                                "created_at": event.get("created_at"),
                                "answered": event.get("answered"),
                            }
                        )
                return sorted(results, key=lambda e: e.get("created_at", ""), reverse=True)[:limit]

            return await loop.run_in_executor(None, _events)
        except Exception as e:
            self.logger.error(f"Ring get_messages error: {e}")
            return []
