"""
cloud_council_bridge.py — Cloud LLM adviser bridge for OpenFang Council of Dozens.

Provides a unified async interface for external SaaS advisers: Groq, DeepSeek,
Together.ai, HuggingFace Inference API, OpenAI, and Moonshot (Kimi).

All providers are wrapped in a single call: query_cloud_adviser().

URL scheme in OPENFANG_COUNCIL_MODELS / --tiebreaker flag:
    groq://llama-3.1-8b-instant
    deepseek://deepseek-reasoner
    together://Qwen/Qwen2.5-72B-Instruct-Turbo
    hf://deepseek-ai/DeepSeek-R1-Distill-Qwen-32B
    openai://gpt-4o-mini
    moonshot://moonshot-v1-128k

Cost enforcement:
    All calls are gated against OPENFANG_CLOUD_BUDGET_USD (default: $0.05 per call).
    The registry (council_advisers.json) carries cost_per_m annotations.
    If the estimated cost exceeds budget, the call is refused and logged.
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("openfang.cloud_council")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_REGISTRY_PATH = Path(__file__).parent.parent / "configs" / "council_advisers.json"
_CLOUD_BUDGET_USD = float(os.environ.get("OPENFANG_CLOUD_BUDGET_USD", "0.05"))
_TIMEOUT = float(os.environ.get("OPENFANG_CLOUD_TIMEOUT", "30"))


def _load_registry() -> Dict[str, Any]:
    if _REGISTRY_PATH.exists():
        with open(_REGISTRY_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


_REGISTRY: Dict[str, Any] = _load_registry()


# ---------------------------------------------------------------------------
# URL parsing
# ---------------------------------------------------------------------------


def parse_cloud_url(url: str) -> Dict[str, str]:
    """
    Parse a cloud adviser URL.

    Examples:
        groq://llama-3.1-8b-instant            → provider=groq, model=llama-3.1-8b-instant
        deepseek://deepseek-reasoner           → provider=deepseek, model=deepseek-reasoner
        hf://Qwen/Qwen2.5-72B-Instruct        → provider=hf, model=Qwen/Qwen2.5-72B-Instruct
        together://org/model-name              → provider=together, model=org/model-name
        openai://gpt-4o-mini                   → provider=openai, model=gpt-4o-mini
    """
    m = re.match(r"(groq|deepseek|together|hf|openai|moonshot)://(.+)", url)
    if not m:
        raise ValueError(
            f"Invalid cloud adviser URL: '{url}'. "
            "Expected: provider://model  (groq, deepseek, together, hf, openai, moonshot)"
        )
    return {"provider": m.group(1), "model": m.group(2)}


def is_cloud_url(s: str) -> bool:
    return bool(re.match(r"(groq|deepseek|together|hf|openai|moonshot)://", s))


# ---------------------------------------------------------------------------
# Cost guard
# ---------------------------------------------------------------------------


def _estimate_cost_usd(provider: str, model: str, token_estimate: int = 2000) -> float:
    """Rough cost estimate based on registry cost_per_m annotation."""
    try:
        models = _REGISTRY["providers"][provider]["models"]
        cost_per_m = models.get(model, {}).get(
            "cost_per_m",
            _REGISTRY["providers"][provider].get("cost_per_m", 1.0),
        )
        return (token_estimate / 1_000_000) * float(cost_per_m)
    except (KeyError, TypeError):
        return 0.01  # Conservative default if registry lookup fails


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------


async def _call_openai_compat(
    api_base: str,
    api_key: str,
    model: str,
    prompt: str,
    system_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """Call any OpenAI-compatible API (Groq, DeepSeek, Together, OpenAI, Moonshot)."""
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": messages, "max_tokens": 800}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{api_base}/chat/completions", json=payload, headers=headers
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "success": True,
            "response": data["choices"][0]["message"]["content"],
            "model": model,
            "usage": data.get("usage", {}),
        }


async def _call_hf_inference(
    model: str,
    prompt: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Call HuggingFace Inference API (free tier or PRO token)."""
    api_base = (
        _REGISTRY.get("providers", {})
        .get("hf", {})
        .get("api_base", "https://api-inference.huggingface.co/models")
    )
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # HF Inference API: POST /<model> with {"inputs": ..., "parameters": ...}
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 800, "return_full_text": False},
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT + 30) as client:  # HF has cold starts
        resp = await client.post(f"{api_base}/{model}", json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    # HF returns a list of generated_text objects
    if isinstance(data, list) and data:
        text = data[0].get("generated_text", str(data[0]))
    elif isinstance(data, dict):
        text = data.get("generated_text", str(data))
    else:
        text = str(data)

    return {
        "success": True,
        "response": text.strip(),
        "model": f"hf/{model}",
        "usage": {},
    }


# ---------------------------------------------------------------------------
# Unified entry point
# ---------------------------------------------------------------------------


async def query_cloud_adviser(
    cloud_url: str,
    prompt: str,
    system_prompt: Optional[str] = None,
    budget_usd: float = _CLOUD_BUDGET_USD,
) -> Dict[str, Any]:
    """
    Query a cloud LLM adviser by URL schema.

    Parameters
    ----------
    cloud_url    : Provider URL, e.g. "groq://llama-3.1-8b-instant"
    prompt       : The council prompt to send
    system_prompt: Optional system context
    budget_usd   : Maximum cost in USD for this single call

    Returns
    -------
    {"success": True, "response": str, "model": str, "estimated_cost_usd": float}
    or
    {"success": False, "error": str}
    """
    try:
        cfg = parse_cloud_url(cloud_url)
    except ValueError as e:
        return {"success": False, "error": str(e)}

    provider = cfg["provider"]
    model = cfg["model"]

    # Cost guard
    estimated_cost = _estimate_cost_usd(
        provider, model, token_estimate=len(prompt.split()) * 3
    )
    if estimated_cost > budget_usd:
        return {
            "success": False,
            "error": (
                f"Cost guard: estimated ${estimated_cost:.4f} for {provider}/{model} "
                f"exceeds budget ${budget_usd:.4f}. "
                "Raise OPENFANG_CLOUD_BUDGET_USD or choose a cheaper model."
            ),
        }

    env_key_name = _REGISTRY.get("providers", {}).get(provider, {}).get("env_key", "")
    api_key = os.environ.get(env_key_name, "") if env_key_name else ""
    api_base = _REGISTRY.get("providers", {}).get(provider, {}).get("api_base", "")

    logger.info(
        f"Cloud adviser: {provider}/{model} | est. cost: ${estimated_cost:.4f} | "
        f"api_key: {'✓' if api_key else '✗ MISSING'}"
    )

    if not api_key and provider != "hf":
        return {
            "success": False,
            "error": (
                f"No API key for provider '{provider}'. Set env var {env_key_name}."
            ),
        }

    try:
        if provider == "hf":
            result = await _call_hf_inference(model, prompt, api_key=api_key or None)
        else:
            result = await _call_openai_compat(
                api_base, api_key, model, prompt, system_prompt
            )

        result["estimated_cost_usd"] = estimated_cost
        result["provider"] = provider
        logger.info(
            f"Cloud adviser response received: {len(result.get('response', ''))} chars"
        )
        return result

    except httpx.HTTPStatusError as e:
        return {
            "success": False,
            "error": f"HTTP {e.response.status_code} from {provider}: {e.response.text[:200]}",
            "provider": provider,
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Cloud adviser error ({provider}/{model}): {e}",
            "provider": provider,
        }


# ---------------------------------------------------------------------------
# Tiebreaker logic
# ---------------------------------------------------------------------------


def _detect_tiebreaker_needed(synthesis_text: str) -> bool:
    """Return True if the synthesis text signals an unresolved debate."""
    policy = _REGISTRY.get("tiebreaker_policy", {})
    triggers = policy.get("trigger_phrases", ["split", "tied", "inconclusive"])
    lower = synthesis_text.lower()
    return any(t in lower for t in triggers)


def _cheapest_available_adviser() -> Optional[str]:
    """Return the cheapest cloud adviser URL with an available API key."""
    policy = _REGISTRY.get("tiebreaker_policy", {})
    order = policy.get(
        "preferred_order", ["groq", "deepseek", "together", "hf", "openai"]
    )
    providers = _REGISTRY.get("providers", {})

    for prov in order:
        cfg = providers.get(prov, {})
        env_key_name = cfg.get("env_key", "")
        api_key = os.environ.get(env_key_name, "") if env_key_name else ""
        if api_key or prov == "hf":  # HF has a free tier
            # Pick the cheapest model in this provider
            models = cfg.get("models", {})
            if not models:
                continue
            cheapest_model = min(
                models.items(), key=lambda kv: kv[1].get("cost_per_m", 99)
            )
            return f"{prov}://{cheapest_model[0]}"

    return None


async def tiebreaker_call(
    synthesis: str,
    task_desc: str,
    budget_usd: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Called when the Adjudicator-in-Chief's synthesis signals a deadlock.
    Selects the cheapest available cloud adviser and requests a casting vote.

    Returns
    -------
    {"invoked": True, "adviser": url, "response": str, "cost": float}
    or
    {"invoked": False, "reason": str}
    """
    if not _detect_tiebreaker_needed(synthesis):
        return {"invoked": False, "reason": "No tiebreaker trigger in synthesis."}

    adviser_url = _cheapest_available_adviser()
    if not adviser_url:
        return {
            "invoked": False,
            "reason": "No cloud adviser API keys configured. Set GROQ_API_KEY, DEEPSEEK_API_KEY, or HF_TOKEN.",
        }

    cap = budget_usd or _CLOUD_BUDGET_USD
    logger.info(f"Tiebreaker triggered → {adviser_url} (budget: ${cap:.4f})")

    tiebreaker_prompt = (
        "You are an external expert adviser called in to break a deadlock on the OpenFang Council of Dozens.\n\n"
        f"ORIGINAL TASK: {task_desc}\n\n"
        f"COUNCIL SYNTHESIS (split/inconclusive):\n{synthesis}\n\n"
        "Cast a decisive vote. Start with 'APPROVE' or 'REJECT', "
        "followed by a brief reductionist rationale. Be direct."
    )

    result = await query_cloud_adviser(
        cloud_url=adviser_url,
        prompt=tiebreaker_prompt,
        budget_usd=cap,
    )

    if result["success"]:
        return {
            "invoked": True,
            "adviser": adviser_url,
            "response": result["response"],
            "cost": result.get("estimated_cost_usd", 0.0),
        }
    else:
        return {
            "invoked": False,
            "reason": f"Tiebreaker adviser failed: {result.get('error')}",
        }
