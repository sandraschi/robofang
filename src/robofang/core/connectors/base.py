"""RoboFang Connector Base and Helpers."""

import abc
import logging
from email.header import decode_header as _decode_header
from typing import Any

logger = logging.getLogger(__name__)


def _decode_mime_header(value: str) -> str:
    """Decode RFC-2047 encoded email headers (UTF-8 Base64, Quoted-Printable)."""
    if not value:
        return value
    try:
        parts = _decode_header(value)
        result = ""
        for decoded, encoding in parts:
            if isinstance(decoded, bytes):
                result += decoded.decode(encoding or "utf-8", errors="replace")
            else:
                result += str(decoded)
        return result
    except Exception:
        return value


class BaseConnector(abc.ABC):
    """Base class for all RoboFang sovereign connectors."""

    def __init__(self, name: str, config: dict[str, Any]):
        self.name = name
        self.config = config
        self.logger = logging.getLogger(f"robofang.connectors.{name}")
        self.active = False

    @abc.abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the external service."""

    @abc.abstractmethod
    async def disconnect(self) -> bool:
        """Gracefully disconnect from the external service."""

    @abc.abstractmethod
    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Send a message / command to a specific target."""

    @abc.abstractmethod
    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        """Retrieve recent messages / readings from the service."""

    async def ping(self) -> bool:
        """Health check for the connector connection."""
        return self.active


ConnectorBase = BaseConnector  # backwards compat alias
