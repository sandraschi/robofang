"""
LLM resource routing: choose model tier (and optionally specific model) from
difficulty + priority. Supports load/unload policy and capacity awareness later.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "configs" / "llm_model_tiers.json"
_config: Optional[Dict[str, Any]] = None


def _load_config() -> Dict[str, Any]:
    global _config
    if _config is not None:
        return _config
    _config = {}
    if _CONFIG_PATH.exists():
        try:
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                _config = json.load(f)
        except Exception as e:
            logger.warning("Could not load llm_model_tiers.json: %s", e)
    return _config


def get_default_resident() -> str:
    """Model to keep loaded when possible (small, fast)."""
    return _load_config().get("default_resident", "llama3.2:3b")


def get_capacity_hint() -> str:
    """Capacity hint for council sizing (e.g. single_gpu_24gb)."""
    return _load_config().get("capacity_hint", "single_gpu_24gb")


def get_tiers() -> Dict[str, List[str]]:
    """Tier name -> list of model names."""
    return _load_config().get("tiers", {})


def route_tier(difficulty_level: str, priority: str = "asap") -> str:
    """
    Return preferred tier (small|medium|large|opus) for this difficulty + priority.
    priority: 'asap' | 'background'
    """
    cfg = _load_config()
    routing = cfg.get("routing", {})
    key = f"{difficulty_level}_{priority}".lower()
    tier = routing.get(key)
    if tier:
        return tier
    if difficulty_level == "simple":
        return "small"
    if difficulty_level == "ambitious":
        return "medium" if priority == "asap" else "small"
    return "small"


def pick_model_for_tier(tier: str, available_models: Optional[List[str]] = None) -> Optional[str]:
    """
    Pick one model in the given tier. If available_models is provided (e.g. from Ollama /api/tags),
    return the first tier model that is available; otherwise return the first in config.
    """
    tiers = get_tiers()
    candidates = tiers.get(tier, [])
    if not candidates:
        return None
    if available_models:
        available_set = {m.strip().lower() for m in available_models}
        for c in candidates:
            if c.lower() in available_set:
                return c
            for a in available_set:
                if a.startswith(c.split(":")[0]):
                    return a
    return candidates[0]


def resolve_models_for_council(
    council_members: List[str],
    capacity_hint: str = "single_gpu_24gb",
) -> List[str]:
    """
    Given requested council members, return a subset that fits capacity.
    For single_gpu_24gb we prefer small/medium only; avoid loading 3x large.
    """
    tiers = get_tiers()
    small_medium = set(tiers.get("small", [])) | set(tiers.get("medium", []))

    def is_small_medium(name: str) -> bool:
        base = name.split("@")[0].strip().lower()
        return any(base.startswith(t.split(":")[0].lower()) for t in small_medium)

    if capacity_hint == "single_gpu_24gb":
        result = [m for m in council_members if is_small_medium(m)]
        if not result:
            result = council_members
        elif len(result) < len(council_members):
            logger.info(
                "Capacity single_gpu_24gb: using %d small/medium members (skipped %d large/opus).",
                len(result),
                len(council_members) - len(result),
            )
    else:
        result = council_members
    return result
