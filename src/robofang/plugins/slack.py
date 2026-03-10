"""
Slack connector plugin.

Delegates to core SlackConnector when present. If core does not define
SlackConnector, this module provides a no-op connector so discovery does not
fail. Enable "slack" in federation_map and set token/channel_id for real Slack.
"""

import logging
from typing import Dict, Any, List
from robofang.core.connectors import BaseConnector

logger = logging.getLogger(__name__)

try:
    from robofang.core.connectors import SlackConnector as CoreSlackConnector

    _HAS_CORE_SLACK = True
except ImportError:
    _HAS_CORE_SLACK = False


if _HAS_CORE_SLACK:
    SlackConnector = CoreSlackConnector
else:

    class SlackConnector(BaseConnector):
        """Slack connector; requires slack_sdk and core SlackConnector. Not connected."""

        connector_type = "slack"

        def __init__(self, name: str, config: Dict[str, Any]):
            super().__init__(name, config)
            self.active = False

        async def connect(self) -> bool:
            self.logger.warning(
                "SlackConnector: core SlackConnector not available or slack_sdk not installed."
            )
            return False

        async def disconnect(self) -> bool:
            self.active = False
            return True

        async def send_message(self, target: str, content: str, **kwargs) -> bool:
            return False

        async def get_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
            return []
