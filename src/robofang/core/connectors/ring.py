"""Ring Connector."""

import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class RingConnector(BaseConnector):
    """Connector for Ring doorbells and cameras.

    Uses the async ring_doorbell >= 0.9 API. Token cached as JSON in ring_token.cache
    (same format as devices-mcp, so its cache file can be reused).
    config:
      email      - Ring account email (only needed when there is no cached token)
      password   - Ring account password (only needed when there is no cached token)
      token_file - path to token cache (default: ring_token.cache)

    Accounts with 2FA need a cached token: a password login raises Requires2FAError.
    """

    connector_type = "ring"

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        self._ring: Any | None = None
        self._auth: Any | None = None

    async def connect(self) -> bool:
        try:
            from ring_doorbell import Auth, Requires2FAError, Ring
        except ImportError:
            self.logger.error("ring_doorbell not installed. pip install ring_doorbell")
            return False

        email = self.config.get("email", "")
        password = self.config.get("password", "")
        token_path = Path(self.config.get("token_file", "ring_token.cache"))

        token_data = None
        if token_path.exists():
            try:
                token_data = json.loads(await asyncio.to_thread(token_path.read_text, encoding="utf-8"))
            except (OSError, ValueError) as exc:
                self.logger.warning("Ring token cache unreadable (%s): %s", token_path, exc)

        def _save_token(token: dict[str, Any]) -> None:
            try:
                token_path.write_text(json.dumps(token), encoding="utf-8")
            except OSError as exc:
                self.logger.warning("Ring token cache write failed: %s", exc)

        auth = Auth("RoboFang/1.0", token_data, _save_token)
        try:
            if not token_data:
                if not (email and password):
                    self.logger.error("Ring: no cached token and no email/password configured")
                    await auth.async_close()
                    return False
                await auth.async_fetch_token(email, password)
            ring = Ring(auth)
            await ring.async_update_data()
            count = len(ring.devices().all_devices)
        except Requires2FAError:
            self.logger.error("Ring account requires 2FA: create a token cache first (e.g. via devices-mcp)")
            await auth.async_close()
            return False
        except Exception as e:
            self.logger.error(f"Ring connection failed: {e}")
            await auth.async_close()
            return False

        self._auth, self._ring = auth, ring
        self.logger.info(f"Ring connected. Devices: {count}")
        self.active = True
        return True

    async def disconnect(self) -> bool:
        if self._auth is not None:
            try:
                await self._auth.async_close()
            except Exception as exc:
                self.logger.debug("Ring session close failed: %s", exc)
        self._auth = None
        self._ring = None
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Trigger a Ring action.

        target  - device name or "all"
        content - "snapshot" | "live_stream_url"
        """
        if not self._ring:
            return False
        self.logger.info(f"Ring: {content} on {target} (read-only API, no actuation)")
        # Ring API is mostly read-only (no remote relay triggers via ring_doorbell lib)
        return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return recent motion/doorbell events."""
        if not self._ring:
            return []
        try:
            devices = self._ring.devices().video_devices
            per_device = max(1, limit // max(1, len(devices)))
            results = []
            for device in devices:
                for event in await device.async_history(limit=per_device):
                    results.append(
                        {
                            "device": device.name,
                            "kind": event.get("kind"),
                            "created_at": str(event.get("created_at", "")),
                            "answered": event.get("answered"),
                        }
                    )
            return sorted(results, key=lambda e: e["created_at"], reverse=True)[:limit]
        except Exception as e:
            self.logger.error(f"Ring get_messages error: {e}")
            return []
