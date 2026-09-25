"""
Slack connector plugin.

Re-exports the core SlackConnector (slack_sdk is imported lazily inside it, so this
import cannot fail). Enable "slack" in federation_map and set token/channel_id.
"""

from robofang.core.connectors import SlackConnector

__all__ = ["SlackConnector"]
