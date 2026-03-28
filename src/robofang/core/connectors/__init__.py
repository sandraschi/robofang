"""RoboFang Connectors Package."""

# Legacy aliases / stubs
from .base import BaseConnector, ConnectorBase, _decode_mime_header, logger
from .bridge import MCPBridgeConnector
from .calibre import CalibreConnector
from .discord_c import DiscordConnector
from .email import EmailConnector
from .homeassistant import HomeAssistantConnector
from .hue import HueConnector
from .moltbook import MoltbookConnector
from .plex import PlexConnector
from .resonite import ResoniteConnector
from .ring import RingConnector
from .shelly import ShellyConnector
from .slack_c import SlackConnector
from .tapo import TapoConnector


class SocialConnector(BaseConnector):
    """Not implemented. Use DiscordConnector or SlackConnector."""

    connector_type = "social"

    async def connect(self) -> bool:
        logger.warning("SocialConnector is not implemented. Enable discord_c or slack_c connector.")
        self.active = False
        return False

    async def disconnect(self) -> bool:
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        return False

    async def get_messages(self, limit: int = 10) -> list:
        return []


class IoTConnector(BaseConnector):
    """DEPRECATED. Use TapoConnector, HueConnector, or ShellyConnector."""

    connector_type = "iot"

    async def connect(self) -> bool:
        logger.warning("IoTConnector deprecated. Use TapoConnector/HueConnector/ShellyConnector.")
        self.active = True
        return True

    async def disconnect(self) -> bool:
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        return False

    async def get_messages(self, limit: int = 10) -> list:
        return [{"status": "deprecated — use TapoConnector, HueConnector, or ShellyConnector"}]


__all__ = [
    "BaseConnector",
    "ConnectorBase",
    "_decode_mime_header",
    "MoltbookConnector",
    "EmailConnector",
    "TapoConnector",
    "HueConnector",
    "ShellyConnector",
    "HomeAssistantConnector",
    "RingConnector",
    "PlexConnector",
    "CalibreConnector",
    "DiscordConnector",
    "SlackConnector",
    "ResoniteConnector",
    "MCPBridgeConnector",
    "SocialConnector",
    "IoTConnector",
]
