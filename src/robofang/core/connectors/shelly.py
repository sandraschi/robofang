"""Shelly Connector."""

import logging
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class ShellyConnector(BaseConnector):
    """Connector for Shelly smart devices via local REST API.

    Supports Gen1 (/relay/0) and Gen2+ (rpc/Switch.Set) automatically.
    No cloud dependency — pure LAN REST.

    config:
      devices — list of {host, alias, gen (1|2), channel (default 0)} dicts
    """

    connector_type = "shelly"

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        self._online: dict[str, dict[str, Any]] = {}  # alias → device info

    async def _get(self, host: str, path: str) -> dict | None:
        import httpx

        try:
            async with httpx.AsyncClient(timeout=5.0) as c:
                r = await c.get(f"http://{host}{path}")
                r.raise_for_status()
                return r.json()
        except Exception:
            return None

    async def _post(self, host: str, path: str, data: dict) -> dict | None:
        import httpx

        try:
            async with httpx.AsyncClient(timeout=5.0) as c:
                r = await c.post(f"http://{host}{path}", json=data)
                r.raise_for_status()
                return r.json()
        except Exception:
            return None

    async def connect(self) -> bool:
        device_list = self.config.get("devices", [])
        ok = 0
        for d in device_list:
            host = d.get("host")
            alias = d.get("alias") or host
            gen = d.get("gen", 1)
            # Gen1: GET /shinfo  Gen2: GET /rpc/Shelly.GetStatus
            probe = "/shelly" if gen == 1 else "/rpc/Shelly.GetStatus"
            info = await self._get(host, probe)
            if info:
                self._online[alias] = {**d, "info": info}
                self.logger.info(f"Shelly Gen{gen}: {alias} ({host}) online")
                ok += 1
            else:
                self.logger.warning(f"Shelly: {alias} ({host}) unreachable")
        self.active = ok > 0 or not device_list
        return self.active

    async def disconnect(self) -> bool:
        self._online.clear()
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Control a Shelly device. content: on|off|toggle"""
        dev = self._online.get(target)
        if not dev:
            self.logger.warning(f"Shelly: unknown device '{target}'")
            return False
        host = dev["host"]
        gen = dev.get("gen", 1)
        ch = dev.get("channel", 0)
        cmd = content.strip().lower()
        try:
            if gen == 1:
                action = "on" if cmd == "on" else ("off" if cmd == "off" else "toggle")
                result = await self._get(host, f"/relay/{ch}?turn={action}")
            else:
                if cmd == "toggle":
                    status = await self._get(host, "/rpc/Shelly.GetStatus")
                    current = status.get("switch:0", {}).get("output", False) if status else False
                    on_val = not current
                else:
                    on_val = cmd == "on"
                result = await self._post(host, "/rpc/Switch.Set", {"id": ch, "on": on_val})
            ok = result is not None
            self.logger.info(f"Shelly {target} {cmd} -> {ok}")
            return ok
        except Exception as e:
            self.logger.error(f"Shelly command error on {target}: {e}")
            return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        readings = []
        for alias, dev in list(self._online.items())[:limit]:
            host = dev["host"]
            gen = dev.get("gen", 1)
            ch = dev.get("channel", 0)
            try:
                if gen == 1:
                    r = await self._get(host, f"/relay/{ch}")
                    readings.append(
                        {
                            "alias": alias,
                            "on": r.get("ison") if r else None,
                            "power_w": r.get("power") if r else None,
                        }
                    )
                else:
                    r = await self._get(host, "/rpc/Shelly.GetStatus")
                    sw = (r or {}).get(f"switch:{ch}", {})
                    readings.append(
                        {
                            "alias": alias,
                            "on": sw.get("output"),
                            "power_w": sw.get("apower"),
                            "voltage_v": sw.get("voltage"),
                        }
                    )
            except Exception as e:
                readings.append({"alias": alias, "error": str(e)})
        return readings
