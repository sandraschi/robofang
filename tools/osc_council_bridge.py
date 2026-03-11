"""
osc_council_bridge.py — OSC round-trip client for embodied Council members.

Sends a Council prompt to any OSC endpoint (Resonite vbot, virtual sensor agent,
physical robot, etc.) and waits for an OSC reply with timeout.

OSC Message Protocol
====================
SEND:  /RoboFang/council/prompt   [round_id: int, adjudicator: str, prompt: str]
RECV:  /RoboFang/council/response [round_id: int, response: str]

Resonite Setup (ProtoFlux)
==========================
1. Add an OSC Input > String receiver on address /RoboFang/council/prompt
2. Wire to a local LLM node (or a LogiX string output for scripted vbot responses)
3. Send reply to /RoboFang/council/response via OSC Output > String
   with the same round_id as the corresponding prompt.

Virtual Sensor Agent Example (D20 Pro Robohoover):
===================================================
The hoover's ProtoFlux reads its coverage map (dynamic texture or bool grid),
formats it as a string ("Covered: 87% | Obstacle at (2.1, 0.8) | Last sweep:
14:32"), and appends it to the council response. It doesn't need an LLM;
its epistemic contribution is grounded world-state, which is worth more.

Usage
=====
    from osc_council_bridge import query_osc_agent
    result = await query_osc_agent(
        host="127.0.0.1",
        port=9001,
        adjudicator="robohoover-d20",
        prompt="What is the state of the apartment?",
        timeout=10.0,
    )
    # result: {"success": True, "response": "Covered: 87% | ..."}
"""

import asyncio
import logging
import uuid
from typing import Any, Dict, Optional

logger = logging.getLogger("RoboFang.osc_council_bridge")

# Try to import python-osc; fall back gracefully so the module can always be imported
try:
    from pythonosc.dispatcher import Dispatcher
    from pythonosc.osc_server import AsyncIOOSCUDPServer
    from pythonosc.udp_client import SimpleUDPClient

    _HAS_PYTHONOSC = True
except ImportError:
    _HAS_PYTHONOSC = False
    logger.warning(
        "python-osc not installed. OSC council bridge will be unavailable. "
        "Install with: uv pip install python-osc"
    )


# ---------------------------------------------------------------------------
# Internal state: pending round registry
# ---------------------------------------------------------------------------

_pending_rounds: Dict[str, asyncio.Future] = {}
_listener_task: Optional[asyncio.Task] = None
_listener_port: Optional[int] = None


def _osc_response_handler(address: str, round_id: str, response: str):
    """Called by the OSC server when a /RoboFang/council/response arrives."""
    if round_id in _pending_rounds:
        fut = _pending_rounds.pop(round_id)
        if not fut.done():
            fut.set_result(response)
    else:
        logger.debug(f"Received OSC response for unknown round_id={round_id}")


async def _ensure_listener(listen_port: int = 9010) -> None:
    """Lazily start the OSC response listener on the given port."""
    global _listener_task, _listener_port

    if _listener_task and not _listener_task.done() and _listener_port == listen_port:
        return  # Already running

    if not _HAS_PYTHONOSC:
        return

    dispatcher = Dispatcher()
    dispatcher.map("/RoboFang/council/response", _osc_response_handler)

    server = AsyncIOOSCUDPServer(("0.0.0.0", listen_port), dispatcher, asyncio.get_event_loop())
    transport, _protocol = await server.create_serve_endpoint()
    _listener_port = listen_port

    async def _run():
        try:
            while True:
                await asyncio.sleep(3600)
        except asyncio.CancelledError:
            transport.close()

    _listener_task = asyncio.create_task(_run())
    logger.info(f"OSC council listener started on port {listen_port}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def query_osc_agent(
    host: str,
    port: int,
    adjudicator: str,
    prompt: str,
    timeout: float = 15.0,
    listen_port: int = 9010,
) -> Dict[str, Any]:
    """
    Send a council prompt to an OSC endpoint and wait for a response.

    Parameters
    ----------
    host        : Target OSC host (e.g. "127.0.0.1" for local Resonite)
    port        : Target OSC port (e.g. 9001 — must match Resonite OSC receiver)
    adjudicator : Label for this agent (e.g. "vbot-aria", "robohoover-d20")
    prompt      : The council round prompt text
    timeout     : Seconds to wait for a response before giving up
    listen_port : Local UDP port to receive the response on

    Returns
    -------
    {"success": True, "response": str, "agent": adjudicator}
    or
    {"success": False, "error": str, "agent": adjudicator}
    """
    if not _HAS_PYTHONOSC:
        return {
            "success": False,
            "error": "python-osc not installed. Run: uv pip install python-osc",
            "agent": adjudicator,
        }

    round_id = str(uuid.uuid4())[:8]
    loop = asyncio.get_event_loop()

    # Ensure listener is running
    await _ensure_listener(listen_port)

    # Register pending future
    fut: asyncio.Future = loop.create_future()
    _pending_rounds[round_id] = fut

    # Send prompt
    try:
        client = SimpleUDPClient(host, port)
        client.send_message("/RoboFang/council/prompt", [round_id, adjudicator, prompt])
        logger.info(f"OSC prompt sent → {host}:{port} | round={round_id} | agent={adjudicator}")
    except Exception as e:
        _pending_rounds.pop(round_id, None)
        return {
            "success": False,
            "error": f"Failed to send OSC message to {host}:{port}: {e}",
            "agent": adjudicator,
        }

    # Wait for response
    try:
        response = await asyncio.wait_for(fut, timeout=timeout)
        logger.info(f"OSC response received from {adjudicator} (round={round_id})")
        return {
            "success": True,
            "response": response,
            "agent": adjudicator,
            "round_id": round_id,
        }
    except asyncio.TimeoutError:
        _pending_rounds.pop(round_id, None)
        return {
            "success": False,
            "error": (
                f"OSC agent '{adjudicator}' at {host}:{port} timed out after {timeout}s. "
                "Check Resonite OSC receiver is running and ProtoFlux is wired."
            ),
            "agent": adjudicator,
        }


def parse_osc_url(osc_url: str) -> Dict[str, Any]:
    """
    Parse an OSC/Resonite adjudicator URL into connection parameters.

    Supported formats:
        osc://host:port/label               →  plain OSC (any agent)
        resonite://host:port/label          →  Resonite avatar (same protocol, different label)

    Examples:
        osc://127.0.0.1:9001/robohoover-d20
        resonite://127.0.0.1:9002/vbot-aria
        resonite://192.168.1.42:9001/council-avatar
    """
    import re

    m = re.match(r"(osc|resonite)://([^:/]+):(\d+)/(.+)", osc_url)
    if not m:
        raise ValueError(
            f"Invalid OSC/Resonite adjudicator URL: '{osc_url}'. "
            "Expected format: osc://host:port/label or resonite://host:port/label"
        )
    return {
        "scheme": m.group(1),
        "host": m.group(2),
        "port": int(m.group(3)),
        "label": m.group(4),
    }
