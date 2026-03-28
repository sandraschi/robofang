"""
voice_bridge.py — MCP-to-MCP voice relay bridge for RoboFang.

Connects to kyutai-mcp's voice_pipeline tool via HTTP transport, enabling
any RoboFang orchestrator/agent to speak, listen, and manage Moshi service
state without knowing the underlying voice pipeline details.

Architecture:
    Robofang (orchestrator)
        └─ voice_bridge (this module)
              └─ httpx → kyutai-mcp (http://127.0.0.1:10926/mcp)
                    └─ voice_pipeline tool
                          └─ Moshi 7B speech model (port 8998)

Usage from Robofang MCP:
    # Register as a tool
    mcp.tool()(robofang_voice)

    # Or call from orchestrator directly
    result = await robofang_voice(
        operation="turn",
        utterance="Tell me the weather in Vienna",
    )
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, Literal, Optional

import httpx

logger = logging.getLogger("robofang.bridges.voice")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

KYUTAI_MCP_URL = os.environ.get("KYUTAI_MCP_URL", "http://127.0.0.1:10926/mcp")
KYUTAI_BACKEND_URL = os.environ.get("KYUTAI_BACKEND_URL", "http://127.0.0.1:10924")

# Timeout budget: voice turns with deep reasoner can take 30-60s
_TIMEOUT = httpx.Timeout(connect=5.0, read=90.0, write=10.0, pool=5.0)


# ---------------------------------------------------------------------------
# Low-level: call kyutai-mcp backend REST endpoints directly
# (faster, no MCP protocol overhead, works even if MCP transport is down)
# ---------------------------------------------------------------------------


async def _rest_voice_turn(
    utterance: str,
    session_id: str = "default",
    provider: str = "auto",
    model: Optional[str] = None,
    use_deep_reasoner: bool = True,
    deep_provider: str = "same",
    deep_model: Optional[str] = None,
    location_hint: Optional[str] = None,
) -> Dict[str, Any]:
    """Call kyutai-mcp REST /api/voice/turn."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(
            f"{KYUTAI_BACKEND_URL}/api/voice/turn",
            json={
                "utterance": utterance,
                "session_id": session_id,
                "provider": provider,
                "model": model,
                "use_deep_reasoner": use_deep_reasoner,
                "deep_provider": deep_provider,
                "deep_model": deep_model,
                "location_hint": location_hint,
            },
        )
        r.raise_for_status()
        return r.json()


async def _rest_speak_boilerplate(
    topic: str,
    provider: str = "auto",
    style: str = "normal",
    location: str = "Vienna",
    symbols: Optional[list[str]] = None,
) -> Dict[str, Any]:
    """Call kyutai-mcp REST /api/voice/speak_boilerplate."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        body: Dict[str, Any] = {
            "topic": topic,
            "provider": provider,
            "style": style,
            "location": location,
        }
        if symbols:
            body["symbols"] = symbols
        r = await client.post(
            f"{KYUTAI_BACKEND_URL}/api/voice/speak_boilerplate",
            json=body,
        )
        r.raise_for_status()
        return r.json()


async def _rest_moshi_status() -> Dict[str, Any]:
    """Call kyutai-mcp REST /api/moshi/service/status."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        r = await client.get(f"{KYUTAI_BACKEND_URL}/api/moshi/service/status")
        r.raise_for_status()
        return r.json()


async def _rest_sessions() -> Dict[str, Any]:
    """Call kyutai-mcp REST /api/voice/sessions."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        r = await client.get(f"{KYUTAI_BACKEND_URL}/api/voice/sessions")
        r.raise_for_status()
        return r.json()


async def _rest_session_history(session_id: str) -> Dict[str, Any]:
    """Call kyutai-mcp REST /api/voice/sessions/{session_id}/history."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        r = await client.get(f"{KYUTAI_BACKEND_URL}/api/voice/sessions/{session_id}/history")
        r.raise_for_status()
        return r.json()


# ---------------------------------------------------------------------------
# Health probe
# ---------------------------------------------------------------------------


async def probe_voice_backend() -> Dict[str, Any]:
    """Check if kyutai-mcp backend is reachable and Moshi is up."""
    backend_ok = False
    moshi_status: Optional[Dict[str, Any]] = None
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(3.0)) as client:
            r = await client.get(f"{KYUTAI_BACKEND_URL}/health")
            backend_ok = r.status_code == 200
    except Exception as exc:
        logger.debug("kyutai-mcp backend unreachable: %s", exc)

    if backend_ok:
        try:
            moshi_status = await _rest_moshi_status()
        except Exception:
            pass

    return {
        "backend_url": KYUTAI_BACKEND_URL,
        "backend_reachable": backend_ok,
        "moshi": moshi_status,
    }


# ---------------------------------------------------------------------------
# Unified MCP tool — register this in Robofang's mcp_server.py
# ---------------------------------------------------------------------------


async def robofang_voice(
    operation: Literal[
        "turn",
        "speak_boilerplate",
        "service_status",
        "sessions",
        "session_history",
        "health",
    ] = "health",
    utterance: str = "",
    session_id: str = "default",
    provider: str = "auto",
    model: Optional[str] = None,
    use_deep_reasoner: bool = True,
    deep_provider: str = "same",
    deep_model: Optional[str] = None,
    location_hint: Optional[str] = None,
    topic: str = "weather",
    symbols: Optional[list[str]] = None,
    style: str = "normal",
) -> Dict[str, Any]:
    """robofang_voice — Voice relay to kyutai-mcp voice pipeline (MCP-to-MCP bridge).

    BRIDGE PATTERN:
    RoboFang orchestrator → robofang_voice → kyutai-mcp backend REST → Moshi.
    This avoids double-MCP-protocol overhead by calling the REST layer directly,
    while keeping the MCP tool surface clean for agent discovery.

    Operations:
        turn: Send an utterance through the staged voice pipeline (ack → intent → research → answer).
        speak_boilerplate: Request an agentic briefing (weather, news, stocks, AI).
        service_status: Check Moshi speech server state (running, port, HTTP probe).
        sessions: List all voice sessions with turn counts.
        session_history: Get full turn history for a specific session.
        health: Probe kyutai-mcp backend reachability and Moshi liveness.

    Args:
        operation: Which voice operation to run.
        utterance: User speech text (required for 'turn').
        session_id: Session ID for turn tracking / history lookup.
        provider: LLM provider for voice synthesis — 'auto', 'ollama', 'lmstudio'.
        model: Specific model name or None for auto-select.
        use_deep_reasoner: Use deeper model for final answer synthesis.
        deep_provider: Provider override for deep reasoner — 'same', 'ollama', 'lmstudio'.
        deep_model: Model override for deep reasoner.
        location_hint: Location override for weather queries.
        topic: Briefing topic — 'weather', 'world_news', 'ai_news', 'stock_market'.
        symbols: Stock ticker symbols for stock_market briefings.
        style: Briefing style — 'brief', 'normal', 'detailed'.

    Returns:
        dict with success, result payload, and bridge metadata.
    """
    t0 = time.time()
    try:
        if operation == "health":
            result = await probe_voice_backend()

        elif operation == "turn":
            if not utterance.strip():
                raise ValueError("utterance is required for operation='turn'.")
            result = await _rest_voice_turn(
                utterance=utterance,
                session_id=session_id,
                provider=provider,
                model=model,
                use_deep_reasoner=use_deep_reasoner,
                deep_provider=deep_provider,
                deep_model=deep_model,
                location_hint=location_hint,
            )

        elif operation == "speak_boilerplate":
            result = await _rest_speak_boilerplate(
                topic=topic,
                provider=provider,
                style=style,
                location=location_hint or "Vienna",
                symbols=symbols,
            )

        elif operation == "service_status":
            result = await _rest_moshi_status()

        elif operation == "sessions":
            result = await _rest_sessions()

        elif operation == "session_history":
            result = await _rest_session_history(session_id)

        else:
            raise ValueError(f"Unknown operation: {operation}")

        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info("robofang_voice op=%s took %dms", operation, elapsed_ms)

        return {
            "success": True,
            "operation": operation,
            "result": result,
            "bridge": "kyutai-mcp",
            "backend_url": KYUTAI_BACKEND_URL,
            "execution_time_ms": elapsed_ms,
            "related_operations": [
                "turn",
                "speak_boilerplate",
                "service_status",
                "sessions",
                "session_history",
                "health",
            ],
        }

    except httpx.ConnectError:
        return {
            "success": False,
            "error": f"Cannot reach kyutai-mcp backend at {KYUTAI_BACKEND_URL}",
            "error_type": "connection_error",
            "recovery_options": [
                "Start kyutai-mcp webapp: cd kyutai-mcp/webapp && python -m backend.app",
                "Check KYUTAI_BACKEND_URL env var (current: {})".format(KYUTAI_BACKEND_URL),
                "Run operation='health' to diagnose connectivity",
            ],
        }
    except Exception as e:
        logger.exception("robofang_voice failed: %s", e)
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "recovery_options": [
                "Run operation='health' to check kyutai-mcp reachability",
                "Run operation='service_status' to check Moshi process state",
            ],
        }
