"""Tapo Connector."""

import logging
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class TapoConnector(BaseConnector):
    """Connector for Tapo smart plugs/cameras via python-kasa.

    config:
      username  — Tapo cloud email
      password  — Tapo cloud password
      devices   — list of {host, alias, readonly} dicts
    """

    connector_type = "tapo"

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        self._devices: dict[str, Any] = {}

    async def connect(self) -> bool:
        try:
            from kasa import Credentials, Discover
        except ImportError:
            self.logger.error("python-kasa not installed. pip install python-kasa")
            return False

        username = self.config.get("username", "")
        password = self.config.get("password", "")
        creds = Credentials(username, password) if username else None
        device_list = self.config.get("devices", [])

        ok_count = 0
        for dev_cfg in device_list:
            host = dev_cfg.get("host")
            alias = dev_cfg.get("alias") or dev_cfg.get("device_id") or host
            if not host:
                continue
            try:
                device = await Discover.discover_single(host, credentials=creds)
                await device.update()
                self._devices[alias] = device
                self.logger.info(f"Tapo: {alias} ({host}) on={device.is_on}")
                ok_count += 1
            except Exception as e:
                self.logger.warning(f"Tapo: {alias} ({host}) unreachable: {e}")

        self.active = ok_count > 0 or not device_list
        self.logger.info(f"TapoConnector: {ok_count}/{len(device_list)} devices online.")
        return self.active

    async def disconnect(self) -> bool:
        self._devices.clear()
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Control a Tapo device. content: on|off|toggle|brightness:N"""
        device = self._devices.get(target)
        if not device:
            self.logger.warning(f"Tapo: unknown device '{target}'")
            return False
        # Enforce readonly
        dev_cfg = next(
            (d for d in self.config.get("devices", []) if (d.get("alias") or d.get("device_id")) == target),
            {},
        )
        if dev_cfg.get("readonly"):
            self.logger.warning(f"Tapo: '{target}' is readonly.")
            return False
        try:
            await device.update()
            cmd = content.strip().lower()
            if cmd == "on":
                await device.turn_on()
            elif cmd == "off":
                await device.turn_off()
            elif cmd == "toggle":
                await device.turn_off() if device.is_on else await device.turn_on()
            elif cmd.startswith("brightness:"):
                await device.set_brightness(int(cmd.split(":")[1]))
            else:
                self.logger.warning(f"Tapo: unknown command '{content}'")
                return False
            return True
        except Exception as e:
            self.logger.error(f"Tapo command error on {target}: {e}")
            return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        readings = []
        for alias, device in list(self._devices.items())[:limit]:
            try:
                await device.update()
                entry: dict[str, Any] = {
                    "alias": alias,
                    "model": device.model,
                    "is_on": device.is_on,
                    "host": device.host,
                }
                if hasattr(device, "emeter_realtime"):
                    try:
                        e = await device.get_emeter_realtime()
                        entry["power_w"] = e.get("power")
                    except Exception:
                        pass
                readings.append(entry)
            except Exception as e:
                readings.append({"alias": alias, "error": str(e)})
        return readings
