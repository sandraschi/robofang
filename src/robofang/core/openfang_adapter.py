"""
OpenFang tool-name adapter: maps OpenFang hand tool names to RoboFang MCP connector + tool.
Loaded from configs/openfang_tool_mapping.json; used in orchestrator.execute_tool when
the requested tool is not in the bridge tool registry.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

_PKG_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_DEFAULT_MAPPING_PATH = _PKG_ROOT / "configs" / "openfang_tool_mapping.json"

_mapping: Optional[Dict[str, Dict[str, str]]] = None


def _load_mapping(path: Optional[Path] = None) -> Dict[str, Dict[str, str]]:
    global _mapping
    if _mapping is not None:
        return _mapping
    p = path or _DEFAULT_MAPPING_PATH
    _mapping = {}
    if not p.exists():
        logger.warning("OpenFang tool mapping not found at %s", p)
        return _mapping
    try:
        with open(p, "r", encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, dict):
            for k, v in raw.items():
                if isinstance(v, dict) and "connector" in v and "tool" in v:
                    _mapping[k] = {"connector": str(v["connector"]), "tool": str(v["tool"])}
        logger.info("OpenFang adapter loaded %d tool mappings from %s", len(_mapping), p)
    except Exception as e:
        logger.warning("Failed to load OpenFang tool mapping from %s: %s", p, e)
    return _mapping


def resolve(tool_name: str, path: Optional[Path] = None) -> Optional[Tuple[str, str]]:
    """
    Resolve an OpenFang tool name to (connector_id, mcp_tool_name).
    Returns None if no mapping exists.
    """
    m = _load_mapping(path)
    entry = m.get(tool_name)
    if not entry:
        return None
    return (entry["connector"], entry["tool"])


def get_mapping(path: Optional[Path] = None) -> Dict[str, Dict[str, str]]:
    """Return the full mapping dict for UI/config display."""
    return dict(_load_mapping(path))
