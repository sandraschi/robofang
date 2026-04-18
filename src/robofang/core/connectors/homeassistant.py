"""Home Assistant Connector."""

import logging
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class HomeAssistantConnector(BaseConnector):
    """Connector for Home Assistant via its REST API.

    Covers entities, services, automations, scripts, events — the entire HA
    surface area is available through entity_id targeting.

    config:
      url          — e.g. "http://localhost:8123"
      access_token — long-lived access token
    """

    connector_type = "homeassistant"

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        import os

        self._url = (config.get("url") or os.getenv("HA_URL", "http://localhost:8123")).rstrip("/")
        self._token = config.get("access_token") or os.getenv("HA_TOKEN", "")
        self._headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

    async def _api(self, method: str, path: str, data: dict | None = None) -> Any | None:
        import httpx

        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                url = f"{self._url}/api{path}"
                if method == "GET":
                    r = await c.get(url, headers=self._headers)
                else:
                    r = await c.post(url, headers=self._headers, json=data or {})
                r.raise_for_status()
                return r.json() if r.content else {}
        except Exception as e:
            self.logger.warning(f"HA API error {method} {path}: {e}")
            return None

    async def connect(self) -> bool:
        result = await self._api("GET", "/")
        if result and result.get("message") == "API running.":
            self.active = True
            self.logger.info(f"Home Assistant connected: {self._url}")
            return True
        self.logger.error(f"HA not reachable at {self._url}")
        return False

    async def disconnect(self) -> bool:
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Call an HA service or fire an event.

        target  — "domain.service" e.g. "light.turn_on", "switch.toggle",
                  "automation.trigger", or "event:EVENT_TYPE"
        content — entity_id (or JSON string with extra service data)
        kwargs  — additional service data fields
        """
        import json as _json

        try:
            if target.startswith("event:"):
                event_type = target.split(":", 1)[1]
                result = await self._api("POST", f"/events/{event_type}", {"entity_id": content, **kwargs})
                return result is not None

            domain, service = target.split(".", 1)
            # content can be a plain entity_id or a JSON string
            try:
                service_data = _json.loads(content)
            except Exception:
                service_data = {"entity_id": content}
            service_data.update(kwargs)
            result = await self._api("POST", f"/services/{domain}/{service}", service_data)
            self.logger.info(f"HA service {target} called for {content}")
            return result is not None
        except Exception as e:
            self.logger.error(f"HA send_message error: {e}")
            return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return state of all HA entities (or logbook recent events)."""
        result = await self._api("GET", "/states")
        if not result:
            return []
        # Return the N most recently changed entities
        states = sorted(result, key=lambda s: s.get("last_changed", ""), reverse=True)
        return [
            {
                "entity_id": s["entity_id"],
                "state": s["state"],
                "last_changed": s.get("last_changed"),
                "attributes": {
                    k: v
                    for k, v in s.get("attributes", {}).items()
                    if k in ("friendly_name", "unit_of_measurement", "device_class")
                },
            }
            for s in states[:limit]
        ]
