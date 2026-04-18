"""RoboFang Plugin System: Modular connector discovery and loading."""

import importlib
import logging
import pkgutil

from robofang.core.connectors import BaseConnector

logger = logging.getLogger(__name__)


class PluginManager:
    """
    Manages dynamic loading of RoboFang connectors and abilities.
    Enables feature parity with the legacy OpenClaw plugin system.
    """

    def __init__(self, plugin_package: str = "robofang.plugins"):
        self.plugin_package = plugin_package
        self.connectors: dict[str, type[BaseConnector]] = {}

    def discover_connectors(self) -> dict[str, type[BaseConnector]]:
        """
        Scan the plugins package and local directories for connector classes.
        """
        # 1. Registered Static Connectors (Lazy References)
        # We don't import them here to avoid monolithic startup overhead
        self.connectors = {
            # ── Comms ────────────────────────────────────────────────────────
            "moltbook": "robofang.core.connectors.MCPBridgeConnector",
            "email": "robofang.core.connectors.EmailConnector",
            "discord": "robofang.core.connectors.DiscordConnector",
            "slack": "robofang.core.connectors.SlackConnector",
            "social": "robofang.core.connectors.SocialConnector",
            # ── Physical devices ─────────────────────────────────────────────
            "tapo": "robofang.core.connectors.TapoConnector",
            "hue": "robofang.core.connectors.HueConnector",
            "shelly": "robofang.core.connectors.ShellyConnector",
            "home-assistant": "robofang.core.connectors.HomeAssistantConnector",
            "ring": "robofang.core.connectors.RingConnector",
            "iot": "robofang.core.connectors.IoTConnector",  # deprecated
            # ── Media consumers (via MCPBridgeConnector) ─────────────────────
            "plex": "robofang.core.connectors.MCPBridgeConnector",
            "calibre": "robofang.core.connectors.MCPBridgeConnector",
            "immich": "robofang.core.connectors.MCPBridgeConnector",
            "netatmo": "robofang.core.connectors.MCPBridgeConnector",
            "obs": "robofang.core.connectors.MCPBridgeConnector",
            "davinci-resolve": "robofang.core.connectors.MCPBridgeConnector",
            "reaper": "robofang.core.connectors.MCPBridgeConnector",
            "resolume": "robofang.core.connectors.MCPBridgeConnector",
            "vrchat": "robofang.core.connectors.MCPBridgeConnector",
            "virtualization": "robofang.core.connectors.MCPBridgeConnector",
            "docker": "robofang.core.connectors.MCPBridgeConnector",
            "windows-operations": "robofang.core.connectors.MCPBridgeConnector",
            "monitoring": "robofang.core.connectors.MCPBridgeConnector",
            "tailscale": "robofang.core.connectors.MCPBridgeConnector",
            "advanced-memory": "robofang.core.connectors.MCPBridgeConnector",
            "notion": "robofang.core.connectors.MCPBridgeConnector",
            "fastsearch": "robofang.core.connectors.MCPBridgeConnector",
            "readly": "robofang.core.connectors.MCPBridgeConnector",
            "bookmarks": "robofang.core.connectors.MCPBridgeConnector",
            "git-github": "robofang.core.connectors.MCPBridgeConnector",
            "pywinauto": "robofang.core.connectors.MCPBridgeConnector",
            "alexa": "robofang.core.connectors.MCPBridgeConnector",
            # ── Media creators (via MCPBridgeConnector) ───────────────────────
            "blender": "robofang.core.connectors.MCPBridgeConnector",
            "gimp": "robofang.core.connectors.MCPBridgeConnector",
            "inkscape": "robofang.core.connectors.MCPBridgeConnector",
            # ── Generic MCP bridge (direct registration) ─────────────────────
            "mcp_bridge": "robofang.core.connectors.MCPBridgeConnector",
            # ── Virtual worlds ───────────────────────────────────────────────
            "resonite": "robofang.core.connectors.ResoniteConnector",
        }

        # 2. Dynamic Discovery (Entry Points / Package Scan)
        try:
            package = importlib.import_module(self.plugin_package)
            for _, name, is_pkg in pkgutil.iter_modules(package.__path__):
                if not is_pkg:
                    module_path = f"{self.plugin_package}.{name}"
                    self._scan_module_for_connectors(module_path)
        except ImportError:
            logger.debug(f"Plugin package {self.plugin_package} not found. Skipping dynamic discovery.")

        return self.connectors

    def _scan_module_for_connectors(self, module_path: str):
        """Scans a module without necessarily loading all classes, or registers it for lazy loading."""
        # For now, we still import to find the class, but we could optimize this further
        try:
            module = importlib.import_module(module_path)
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, type) and issubclass(attr, BaseConnector) and attr is not BaseConnector:
                    connector_type = getattr(
                        attr,
                        "connector_type",
                        attr.__name__.lower().replace("connector", ""),
                    )
                    self.connectors[connector_type] = f"{module_path}.{attr_name}"
                    logger.info(f"Discovered plugin connector: {connector_type} from {module_path}")
        except Exception as e:
            logger.error(f"Failed to scan plugin {module_path}: {e}")

    def load_connector(self, connector_type: str) -> type[BaseConnector] | None:
        """Lazily load a specific connector class by its type name."""
        if connector_type not in self.connectors:
            return None

        target = self.connectors[connector_type]
        if isinstance(target, type):
            return target

        try:
            module_path, class_name = target.rsplit(".", 1)
            module = importlib.import_module(module_path)
            connector_class = getattr(module, class_name)
            self.connectors[connector_type] = connector_class
            return connector_class
        except Exception as e:
            logger.error(f"Failed to load connector {connector_type} from {target}: {e}")
            return None

    @classmethod
    def load_all(cls) -> dict[str, type[BaseConnector]]:
        """Legacy helper - now returns discovered but not necessarily loaded registry."""
        manager = cls()
        return manager.discover_connectors()
