"""
Discord connector plugin.

Use core DiscordConnector (robofang.core.connectors.DiscordConnector) for real
Discord via discord.py. This module exists for plugin discovery; the core
connector is registered as "discord" in PluginManager and is the one used when
"discord" is enabled in federation_map.
"""

import logging

from robofang.core.connectors import DiscordConnector as CoreDiscordConnector

logger = logging.getLogger(__name__)


def __getattr__(name: str):
    """Re-export core DiscordConnector so plugins.discord.DiscordConnector is the real one."""
    if name == "DiscordConnector":
        return CoreDiscordConnector
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
