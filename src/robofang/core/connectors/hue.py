"""Hue Connector."""

import asyncio
import logging
from typing import Any, ClassVar

from .base import BaseConnector

logger = logging.getLogger(__name__)


class HueConnector(BaseConnector):
    """Connector for Philips Hue via phue (sync in executor).

    config: bridge_ip, username (developer token)
    """

    connector_type = "hue"
    _COLOURS: ClassVar[dict[str, list[float]]] = {
        "red": [0.675, 0.322],
        "green": [0.408, 0.517],
        "blue": [0.167, 0.040],
        "white": [0.313, 0.329],
        "warm": [0.440, 0.403],
        "cool": [0.240, 0.270],
    }

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        self._bridge: Any | None = None

    async def connect(self) -> bool:
        try:
            from phue import Bridge
        except ImportError:
            self.logger.error("phue not installed. pip install phue")
            return False
        bridge_ip = self.config.get("bridge_ip")
        if not bridge_ip:
            self.logger.error("HueConnector: bridge_ip not configured.")
            return False
        loop = asyncio.get_running_loop()
        try:

            def _conn():
                b = Bridge(bridge_ip, username=self.config.get("username"))
                b.connect()
                return b

            bridge = await loop.run_in_executor(None, _conn)
            self._bridge = bridge
            lights = await loop.run_in_executor(None, lambda: bridge.get_light_objects("name"))
            names = list(lights) if isinstance(lights, dict) else []  # mode "name" -> dict
            self.logger.info(f"Hue bridge connected. Lights: {names}")
            self.active = True
            return True
        except Exception as e:
            self.logger.error(f"Hue bridge failed: {e}")
            return False

    async def disconnect(self) -> bool:
        self._bridge = None
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Control Hue. target=light name or 'all'. content: on|off|bri:N|color:NAME"""
        bridge = self._bridge
        if not bridge:
            return False
        loop = asyncio.get_running_loop()
        cmd = content.strip().lower()

        def _set():
            lights = bridge.get_light_objects("name")
            targets = list(lights.values()) if target == "all" else ([lights[target]] if target in lights else [])
            if not targets:
                return False
            for light in targets:
                if cmd == "on":
                    light.on = True
                elif cmd == "off":
                    light.on = False
                elif cmd.startswith("bri:"):
                    light.on = True
                    light.brightness = int(cmd.split(":")[1])
                elif cmd.startswith("color:"):
                    colour = cmd.split(":")[1]
                    xy = self._COLOURS.get(colour, self._COLOURS["white"])
                    light.on = True
                    bridge.set_light(light.light_id, "xy", xy)
            return True

        try:
            return await loop.run_in_executor(None, _set)
        except Exception as e:
            self.logger.error(f"Hue command error: {e}")
            return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        bridge = self._bridge
        if not bridge:
            return []
        loop = asyncio.get_running_loop()
        try:
            lights = await loop.run_in_executor(None, lambda: bridge.get_light_objects("name"))
            return [
                {
                    "name": n,
                    "on": light.on,
                    "brightness": light.brightness,
                    "reachable": light.reachable,
                }
                for n, light in list(lights.items())[:limit]
            ]
        except Exception as e:
            self.logger.error(f"Hue get_messages error: {e}")
            return []
