import asyncio
import collections
import json
import logging
import os
import subprocess
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, ClassVar, Dict, List, Optional

import httpx
import psutil
import uvicorn
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastmcp import FastMCP
from pydantic import BaseModel

from robofang.core.external_registries import (
    discover_docker,
    discover_registry,
    get_registry_server_repo,
    normalize_github_repo_url,
)
from robofang.core.hand_manifest import HandAgentConfig, HandDefinition
from robofang.core.installer import HandManifestItem
from robofang.core.orchestrator import OrchestrationClient
from robofang.diagnostics import router as diagnostics_router
from robofang.mcp_server import get_help_content, register_mcp
from robofang.messaging import (
    fetch_unseen_emails as messaging_fetch_unseen_emails,
)
from robofang.messaging import (
    is_email_comms_configured as messaging_is_email_configured,
)
from robofang.messaging import (
    mark_imap_seen as messaging_mark_imap_seen,
)
from robofang.messaging import (
    reply_to as messaging_reply_to,
)
from robofang.messaging import (
    reply_to_email as messaging_reply_to_email,
)
from robofang.messaging import (
    reply_to_telegram_chat as messaging_reply_to_telegram_chat,
)
from robofang.messaging import (
    set_comms_storage,
)
from robofang.plugins.collector_hand import CollectorHand
from robofang.plugins.robotics_hand import RoboticsHand
from robofang.plugins.routine_runner_hand import RoutineRunnerHand
from robofang.webhooks import router as webhooks_router

# Bridge start time (epoch seconds)
_BRIDGE_START_TIME = time.time()

# ---------------------------------------------------------------------------
# In-memory log ring buffer — 300 entries, fed by _RingHandler on root logger.
# Dashboard reads via GET /logs.
# ---------------------------------------------------------------------------

_LOG_BUFFER_SIZE = 300
_log_buffer: collections.deque = collections.deque(maxlen=_LOG_BUFFER_SIZE)
_log_seq = 0  # monotonic id counter


class _RingHandler(logging.Handler):
    """Logging handler that pushes structured entries into _log_buffer."""

    LEVEL_MAP: ClassVar[Dict[int, str]] = {
        logging.DEBUG: "debug",
        logging.INFO: "info",
        logging.WARNING: "warn",
        logging.ERROR: "error",
        logging.CRITICAL: "error",
    }

    def emit(self, record: logging.LogRecord) -> None:
        global _log_seq
        try:
            _log_seq += 1
            _log_buffer.append(
                {
                    "id": f"{int(record.created * 1000)}-{_log_seq}",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(record.created)),
                    "level": self.LEVEL_MAP.get(record.levelno, "info"),
                    "source": record.name.replace("robofang.", "").replace("ROBOFANG_", "")
                    or "core",
                    "message": self.format(record),
                    "category": _categorise(record.name),
                }
            )
        except Exception:
            pass


def _categorise(name: str) -> str:
    n = name.lower()
    if "mcp" in n or "connector" in n or "plugin" in n:
        return "mcp"
    if "security" in n or "auth" in n:
        return "auth"
    if "reason" in n or "skill" in n or "knowledge" in n or "personality" in n:
        return "agent"
    return "system"


# Ring handler MUST be added before basicConfig so every record hits it.
_ring_handler = _RingHandler()
_ring_handler.setFormatter(logging.Formatter("%(message)s"))
logging.getLogger().addHandler(_ring_handler)

# Optional file log for Grafana/Loki (logs/robofang-bridge.log). Same format as console.
_log_file_handler: Optional[logging.Handler] = None
_log_path: Optional[Path] = None
try:
    _repo_root = Path(__file__).resolve().parent.parent.parent
    _logs_dir = _repo_root / "logs"
    _logs_dir.mkdir(parents=True, exist_ok=True)
    _log_path = _logs_dir / "robofang-bridge.log"
    _log_file_handler = logging.FileHandler(_log_path, encoding="utf-8")
    _log_file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    logging.getLogger().addHandler(_log_file_handler)
except OSError:
    _log_path = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("robofang.main")
if _log_path is not None:
    logger.info("File logging active: %s (Promtail/Loki: mount this dir as /logs)", _log_path)
else:
    logger.warning(
        "File logging disabled: logs dir not writable; Loki will not receive bridge logs"
    )

# Global orchestrator instance
orchestrator = OrchestrationClient()
set_comms_storage(orchestrator.storage)

# Register Autonomous Hands
orchestrator.hands.register_hand(
    CollectorHand(
        HandDefinition(
            id="collector",
            name="Collector Hand",
            description="System Hand: Health & Knowledge",
            category="system",
            agent=HandAgentConfig(
                name="Collector",
                description="System monitoring agent",
                system_prompt="Monitor the fleet.",
            ),
        )
    )
)
orchestrator.hands.register_hand(
    RoboticsHand(
        HandDefinition(
            id="robotics",
            name="Robotics Hand",
            description="System Hand: Physical Interaction",
            category="system",
            agent=HandAgentConfig(
                name="Roboter",
                description="Physical interaction agent",
                system_prompt="Manage physical robotics.",
            ),
        )
    )
)
orchestrator.hands.register_hand(
    RoutineRunnerHand(
        HandDefinition(
            id="routine_runner",
            name="Routine Runner",
            description="Runs scheduled routines (e.g. dawn patrol 7am daily).",
            category="system",
            agent=HandAgentConfig(
                name="RoutineRunner",
                description="Wall-clock scheduler for routines",
                system_prompt="Run user routines at scheduled time.",
            ),
        )
    )
)

# ---------------------------------------------------------------------------
# MCP backend port map
# ---------------------------------------------------------------------------

MCP_BACKENDS: Dict[str, str] = {
    # Wave 1 — Home / Media
    "plex": "http://localhost:10740",
    "calibre": "http://localhost:10720",
    "home-assistant": "http://localhost:10782",
    "tapo": "http://localhost:10716",
    "netatmo": "http://localhost:10823",
    "ring": "http://localhost:10728",
    # Wave 2 — Creative Tools
    "blender": "http://localhost:10849",
    "gimp": "http://localhost:10747",
    "obs": "http://localhost:10819",
    "davinci-resolve": "http://localhost:10843",
    "reaper": "http://localhost:10797",
    "resolume": "http://localhost:10770",
    "vrchat": "http://localhost:10712",
    # Wave 3 — Infrastructure (virtualization-mcp: frontend 10700, backend API 10701 for /mcp/tools)
    "virtualization": "http://localhost:10701",
    "docker": "http://localhost:10807",
    "windows-operations": "http://localhost:10749",
    "monitoring": "http://localhost:10809",
    "tailscale": "http://localhost:10821",
    # Wave 4 — Knowledge
    "advanced-memory": "http://localhost:10705",
    "notion": "http://localhost:10811",
    "fastsearch": "http://localhost:10845",
    "immich": "http://localhost:10839",
    "readly": "http://localhost:10863",
    # Wave 5 — Comms & Dev
    "email": "http://localhost:10813",
    "alexa": "http://localhost:10801",
    "rustdesk": "http://localhost:10805",
    "bookmarks": "http://localhost:10803",
    "git-github": "http://localhost:10702",
    "pywinauto": "http://localhost:10789",
    # Wave 6 — Robotics & Hands
    "unitree": "http://localhost:10831",
    "yahboom": "http://localhost:10833",
    "dreame": "http://localhost:10835",
    "hands": "http://localhost:10837",
}

# Overlay from federation_map so config overrides defaults
for _cid, _cfg in orchestrator.topology.get("connectors", {}).items():
    if isinstance(_cfg, dict) and _cfg.get("mcp_backend"):
        MCP_BACKENDS[_cid] = _cfg["mcp_backend"]


# ---------------------------------------------------------------------------
# Repository Mapping for SOTA Launch Logic
# ---------------------------------------------------------------------------


app = FastAPI(
    title="RoboFang Bridge (MCP & robots)",
    version="0.3.0",
)

try:
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app)
except ImportError:
    pass  # optional: prometheus-fastapi-instrumentator not installed

_email_poll_task: Optional[asyncio.Task[None]] = None


async def _email_poll_loop() -> None:
    """Background: poll IMAP for unseen emails, process as commands, reply by SMTP. Runs when SMTP+IMAP configured."""
    loop = asyncio.get_event_loop()
    while True:
        try:
            await asyncio.sleep(60)
            smtp_ok, imap_ok = messaging_is_email_configured()
            if not smtp_ok or not imap_ok:
                continue
            items = await loop.run_in_executor(None, messaging_fetch_unseen_emails)
            if not items:
                continue
            uids = []
            for item in items:
                try:
                    reply_text = await _process_inbox_message(item["body"])
                    if reply_text and item.get("from_addr"):
                        subj = (item.get("subject") or "Re: RoboFang").strip()
                        if not subj.lower().startswith("re:"):
                            subj = f"Re: {subj}"
                        await messaging_reply_to_email(item["from_addr"], subj, reply_text)
                    uids.append(item["uid"])
                except Exception as e:
                    logger.exception("Email poll process failed for uid %s: %s", item.get("uid"), e)
            if uids:
                await loop.run_in_executor(None, lambda: messaging_mark_imap_seen(uids))
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning("Email poll loop error: %s", e)


@app.on_event("startup")
async def startup_event():
    """Manage orchestrator lifecycle and auto-launch enabled fleet nodes."""
    global _email_poll_task
    try:
        t0 = time.perf_counter()
        logger.info("RoboFang Bridge starting up...")
        mp = getattr(orchestrator.installer, "manifest_path", None)
        hb = getattr(orchestrator.installer, "hands_base_dir", None)
        if mp is not None and hb is not None:
            logger.info(
                "Fleet Installer: manifest=%s hands_dir=%s (set ROBOFANG_FLEET_MANIFEST/ROBOFANG_HANDS_DIR to override)",
                mp,
                hb,
            )
        orchestrator.storage.log_event("info", "bridge", "startup_initiated")
        orchestrator._connector_invoker = _invoke_connector_tool
        t1 = time.perf_counter()
        logger.info("Bridge startup: wiring invoker and messaging (%.2fs)", t1 - t0)
        from robofang import messaging as _messaging

        orchestrator._email_sender = _messaging._bridge.send_email
        orchestrator._inbox_processor = _process_inbox_message
        await auto_launch_enabled_connectors()
        t2 = time.perf_counter()
        logger.info("Bridge startup: auto_launch_enabled_connectors done (%.2fs)", t2 - t1)
        await orchestrator.start()
        t3 = time.perf_counter()
        logger.info("Bridge startup: orchestrator.start done (%.2fs total %.2fs)", t3 - t2, t3 - t0)
        await _refresh_mcp_tools_from_backends()
        t4 = time.perf_counter()
        logger.info("Bridge startup: MCP tool discovery done (%.2fs)", t4 - t3)
        orchestrator.storage.log_event("info", "bridge", "startup_complete")
        smtp_ok, imap_ok = messaging_is_email_configured()
        if smtp_ok and imap_ok:
            _email_poll_task = asyncio.create_task(_email_poll_loop())
            logger.info("Email comms: IMAP poll started (inbox commands -> SMTP reply)")
    except Exception as e:
        logger.exception("Bridge startup FAILED: %s", e)
        traceback.print_exc()
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Manage orchestrator lifecycle."""
    global _email_poll_task
    if _email_poll_task is not None:
        _email_poll_task.cancel()
        try:
            await _email_poll_task
        except asyncio.CancelledError:
            pass
    logger.info("RoboFang Bridge shutting down...")
    await orchestrator.stop()


async def auto_launch_enabled_connectors():
    """Launch enabled connectors only when ROBOFANG_AUTO_LAUNCH_CONNECTORS=1 (default: off to avoid many shells)."""
    if os.getenv("ROBOFANG_AUTO_LAUNCH_CONNECTORS", "").strip().lower() not in ("1", "true", "yes"):
        logger.info(
            "Fleet Automation: Auto-launch disabled (set ROBOFANG_AUTO_LAUNCH_CONNECTORS=1 to enable)."
        )
        return
    logger.info("Fleet Automation: Identifying enabled connectors for auto-launch...")
    topology = orchestrator.topology
    connectors = topology.get("connectors", {})

    for name, cfg in connectors.items():
        if isinstance(cfg, dict) and cfg.get("enabled"):
            if name not in REPO_MAP:
                logger.warning(
                    "Fleet Automation: Connector '%s' is enabled but no REPO_MAP entry found.", name
                )
                continue
            repo_path = Path(REPO_MAP[name])
            if not repo_path.exists() or not repo_path.is_dir():
                logger.info(
                    "Fleet Automation: Skipping '%s' (not installed at %s). Install from Fleet Installer first.",
                    name,
                    repo_path,
                )
                continue
            logger.info("Fleet Automation: Triggering auto-launch for '%s'", name)
            try:
                await launch_connector(name)
            except Exception as e:
                logger.error("Fleet Automation: Auto-launch failed for '%s': %s", name, e)


# ---------------------------------------------------------------------------
# Repository Mapping for SOTA Launch Logic
# Only populated when ROBOFANG_REPOS_ROOT is set and dirs exist (e.g. D:/Dev/repos).
# Fresh install: REPO_MAP stays empty; installs go to hands_dir, launch uses hands_dir.
# ---------------------------------------------------------------------------

_REPO_MAP_TEMPLATE: Dict[str, str] = {
    "plex": "plex-mcp",
    "calibre": "calibre-mcp",
    "home-assistant": "home-assistant-mcp",
    "tapo": "tapo-mcp",
    "netatmo": "netatmo-weather-mcp",
    "ring": "ring-mcp",
    "notion": "notion-mcp",
    "blender": "blender-mcp",
    "gimp": "gimp-mcp",
    "obs": "obs-mcp",
    "davinci-resolve": "davinci-resolve-mcp",
    "reaper": "reaper-mcp",
    "resolume": "resolume-mcp",
    "vrchat": "vrchat-mcp",
    "virtualization": "virtualization-mcp",
    "docker": "docker-mcp",
    "windows-operations": "windows-operations-mcp",
    "monitoring": "monitoring-mcp",
    "tailscale": "tailscale-mcp",
    "advanced-memory": "advanced-memory-mcp",
    "fastsearch": "fastsearch-mcp",
    "immich": "immich-mcp",
    "readly": "readly-mcp",
    "email": "email-mcp",
    "alexa": "alexa-mcp",
    "rustdesk": "rustdesk-mcp",
    "bookmarks": "bookmarks-mcp",
    "git-github": "git-github-mcp",
    "pywinauto": "pywinauto-mcp",
    "unitree": "unitree-robotics",
    "yahboom": "yahboom-mcp",
    "dreame": "dreame-mcp",
    "hands": "hands-mcp",
    "robotics": "robotics-mcp",
}


def _build_repo_map() -> Dict[str, str]:
    out: Dict[str, str] = {}
    root = (os.getenv("ROBOFANG_REPOS_ROOT") or "").strip()
    if not root:
        return out
    base = Path(root)
    if not base.is_dir():
        return out
    for name, rel in _REPO_MAP_TEMPLATE.items():
        path = base / rel
        if path.is_dir():
            out[name] = str(path.resolve())
    return out


REPO_MAP: Dict[str, str] = _build_repo_map()


@app.post("/api/connector/launch/{name}")
async def launch_connector(name: str):
    """Launch an MCP sub-server via its start.ps1 script. Requires the server to be installed (repo at REPO_MAP or hands/)."""
    repo_path = REPO_MAP.get(name)
    path = Path(repo_path) if repo_path else None
    if not path or not path.exists() or not path.is_dir():
        hands_base = _hands_base_dir()
        fallback = hands_base / f"{name}-mcp"
        if fallback.exists() and fallback.is_dir():
            path = fallback
            repo_path = str(path)
        else:
            raise HTTPException(
                status_code=404,
                detail="MCP server '%s' not installed. Install it from the Fleet Installer first."
                % name,
            )

    start_ps1 = path / "start.ps1"
    if not start_ps1.exists():
        # Try .bat as fallback
        start_bat = path / "start.bat"
        if start_bat.exists():
            subprocess.Popen(
                [str(start_bat)],
                cwd=repo_path,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
            )
            return {"success": True, "message": f"Launched {name} via {start_bat}"}

        raise HTTPException(status_code=404, detail="Launch script not found in %s" % repo_path)

    try:
        subprocess.Popen(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", str(start_ps1)],
            cwd=repo_path,
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        logger.info("SOTA Trigger: Launched %s from %s", name, repo_path)
        orchestrator.storage.log_event(
            "info",
            "fleet",
            "connector_launched",
            {"name": name, "path": str(repo_path), "method": "start.ps1"},
        )
        return {"success": True, "message": f"Launched {name} via {start_ps1}"}
    except Exception as e:
        logger.error("Failed to launch connector %s: %s", name, e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mcp-tools/refresh")
async def refresh_mcp_tools():
    """Refresh MCP tool discovery from all known backends (e.g. after launching a connector)."""
    await _refresh_mcp_tools_from_backends()
    count = sum(1 for k in orchestrator._tool_registry if k.startswith("mcp_"))
    return {"success": True, "message": f"Registered {count} MCP tools.", "count": count}


@app.get("/api/connectors/{connector_id}/tools")
async def get_connector_tools(connector_id: str):
    """Proxy to connector MCP backend. Tries GET /tools then GET /mcp/tools (FastMCP 3.1). Returns tool list or 404."""
    base = _backend_url_for_connector(connector_id)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            for path in _TOOLS_PATHS:
                r = await client.get(f"{base.rstrip('/')}{path}")
                if r.status_code == 200:
                    return r.json()
            raise HTTPException(status_code=404, detail="Tools endpoint not available")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Connector backend unreachable")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Connector backend timeout")


# Status tool name hints per connector (optional; fallback = first tool with "status" in name)
STATUS_TOOL_PARAMS: Dict[str, Dict[str, Any]] = {
    "blender": {"operation": "status", "format": "text"},
}


@app.get("/api/connectors/{connector_id}/status")
async def get_connector_status(connector_id: str):
    """
    Return server-side status for the connector (e.g. Blender running, installed).
    Tries: GET /health, GET /status, then POST /tool with a status-like tool if available.
    """
    base = _backend_url_for_connector(connector_id)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")

    async with httpx.AsyncClient(timeout=5.0) as client:
        # 1. Try health or status HTTP endpoints
        for path in ("/api/v1/health", "/health", "/status", "/api/status"):
            try:
                r = await client.get(f"{base.rstrip('/')}{path}")
                if r.status_code == 200:
                    try:
                        data = r.json()
                        if isinstance(data, dict):
                            return {
                                "success": True,
                                "server_status": data.get("message") or str(data),
                            }
                        return {"success": True, "server_status": str(data)}
                    except Exception:
                        return {"success": True, "server_status": (r.text or "").strip()[:500]}
            except (httpx.ConnectError, httpx.TimeoutException):
                continue

        # 2. Try POST /tool (Blender-style) with a status tool; support FastMCP 3.1 /mcp/tools
        try:
            tools_list = []
            for path in _TOOLS_PATHS:
                tools_r = await client.get(f"{base.rstrip('/')}{path}")
                if tools_r.status_code == 200:
                    tools_data = tools_r.json()
                    tools_list = (
                        tools_data
                        if isinstance(tools_data, list)
                        else (tools_data.get("tools", []) if isinstance(tools_data, dict) else [])
                    )
                    if isinstance(tools_list, list) and tools_list:
                        break
            if not tools_list:
                return {"success": False, "server_status": None}

            if isinstance(tools_list[0], str):
                tools_list = [{"name": t, "title": t} for t in tools_list]
            status_tool_name = None
            for t in tools_list:
                name = t.get("name") or t.get("title") or ""
                if "status" in name.lower():
                    status_tool_name = name
                    break
            if not status_tool_name:
                return {"success": False, "server_status": None}

            params = STATUS_TOOL_PARAMS.get(connector_id) or {}
            tool_r = await client.post(
                f"{base.rstrip('/')}/tool",
                json={"tool": status_tool_name, "params": params},
            )
            if tool_r.status_code != 200:
                return {"success": False, "server_status": None}
            body = tool_r.json()
            msg = body.get("message") or body.get("data")
            if isinstance(msg, dict):
                msg = msg.get("message") or str(msg)
            return {"success": True, "server_status": (msg or "").strip()[:1000]}
        except (httpx.ConnectError, httpx.TimeoutException):
            return {"success": False, "server_status": None}
        except Exception:
            return {"success": False, "server_status": None}


# ---------------------------------------------------------------------------
# Autonomous Hands API (for hub Hands page and OpenFang adapter)
# ---------------------------------------------------------------------------


@app.get("/api/hands")
async def api_hands_list():
    """List registered autonomous hands (from orchestrator.hands)."""
    hands = []
    for hid, hand in orchestrator.hands.hands.items():
        d = hand.definition
        hands.append(
            {
                "id": d.id,
                "name": d.name,
                "description": d.description,
                "category": d.category,
                "active": hand.active,
                "last_run": hand.last_run,
                "next_run": hand.next_run,
                "pulse_interval": hand.pulse_interval,
                "has_skill_content": bool(getattr(d, "skill_content", None)),
            }
        )
    return {"success": True, "hands": hands}


@app.post("/api/hands/{hand_id}/activate")
async def api_hand_activate(hand_id: str):
    """Activate an autonomous hand."""
    hand = orchestrator.hands.hands.get(hand_id)
    if not hand:
        raise HTTPException(status_code=404, detail=f"Hand not found: {hand_id}")
    hand.activate()
    return {"success": True, "id": hand_id, "active": True}


@app.post("/api/hands/{hand_id}/pause")
async def api_hand_pause(hand_id: str):
    """Pause an autonomous hand."""
    hand = orchestrator.hands.hands.get(hand_id)
    if not hand:
        raise HTTPException(status_code=404, detail=f"Hand not found: {hand_id}")
    hand.pause()
    return {"success": True, "id": hand_id, "active": False}


@app.get("/api/hands/tool-mapping")
async def api_hands_tool_mapping():
    """Return OpenFang tool name -> connector + tool mapping (for UI)."""
    from robofang.core.openfang_adapter import get_mapping

    return {"success": True, "mapping": get_mapping()}


# Enable CORS for dashboard on port 10864
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:10864",
        "http://127.0.0.1:10864",
        "http://localhost:10870",
        "http://127.0.0.1:10870",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
        "https://www.moltbook.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MCP 3.1 unified gateway (SSE at /sse)
mcp = FastMCP.from_fastapi(app, name="RoboFang Sovereign")
register_mcp(mcp, orchestrator)

# Include Webhooks and Diagnostics
app.include_router(webhooks_router)
app.include_router(diagnostics_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log every uncaught exception with traceback and return JSON. HTTPException is left to FastAPI."""
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.exception(
        "Uncaught exception path=%s method=%s: %s",
        request.url.path,
        request.method,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "error": str(exc)},
    )


# ---------------------------------------------------------------------------
# Inbox: process message (try schedule phrase -> routine, else ask). Used by hooks and email poll.
# ---------------------------------------------------------------------------


async def _process_inbox_message(message: str) -> str:
    """
    Process one inbound message. Tries to create a routine from phrase; else runs ask().
    Returns reply text for the user.
    """
    message = (message or "").strip()
    if not message:
        return "No message received."
    # Try parse as schedule (e.g. "dawn patrol 7am daily", "bug bash Friday 2pm weekly")
    prompt = (
        "Extract a scheduled routine from this user message. Reply with ONLY a JSON object, no markdown.\n"
        "Fields: name (short label), time_local (HH:MM 24h), recurrence (daily|weekly), "
        "action_type (use 'dawn_patrol' for patrol with video and report, or 'general' if not a schedule).\n"
        "If the message is NOT about scheduling a recurring task, set action_type to 'general' and omit time_local.\n"
        'Example schedule: {"name": "dawn patrol", "time_local": "07:00", "recurrence": "daily", "action_type": "dawn_patrol"}\n'
        f"User message: {message}"
    )
    try:
        result = await orchestrator.ask(
            prompt,
            use_council=False,
            use_rag=False,
            subject="guest",
            persona="sovereign",
        )
        if not result.get("success"):
            raise ValueError(result.get("error", "Parse failed"))
        raw = result.get("response", "").strip()
        for start in ("{", "```json"):
            if start in raw:
                raw = raw[raw.index(start) :]
                break
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
        data = json.loads(raw)
        action_type = (data.get("action_type") or "").strip().lower()
        if action_type and action_type != "general" and data.get("time_local"):
            name = data.get("name") or "routine"
            time_local = data.get("time_local") or "07:00"
            recurrence = data.get("recurrence") or "daily"
            orchestrator.create_routine(
                name=name,
                time_local=time_local,
                recurrence=recurrence,
                action_type=action_type or "dawn_patrol",
                params={},
            )
            return f"Scheduled: {name} at {time_local} {recurrence}. Activate the Routine Runner hand in Schedule if needed."
    except (json.JSONDecodeError, ValueError, KeyError):
        pass
    except Exception as e:
        logger.debug("Inbox routine parse skipped: %s", e)
    # Not a schedule or parse failed: run as normal command
    try:
        result = await orchestrator.ask(
            message,
            use_council=False,
            use_rag=True,
            subject="guest",
            persona="sovereign",
        )
        if result.get("success"):
            return result.get("response", "") or "Done."
        return result.get("error", "Command failed.") or "Command failed."
    except Exception as e:
        logger.exception("Inbox ask failed")
        return f"Error: {e}"


# ---------------------------------------------------------------------------
# Command webhook: inbound from email/Telegram/etc. -> process inbox, optional reply
# ---------------------------------------------------------------------------


class CommandWebhookRequest(BaseModel):
    message: str
    reply_to: Optional[str] = None  # "telegram" | "discord" | null = no reply


@app.post("/hooks/command")
async def hook_command(req: CommandWebhookRequest):
    """
    Process a natural-language command (schedule phrase or general ask) and optionally send the reply.
    Wire email-to-webhook or a bot to POST here: body.message = user text,
    body.reply_to = "telegram" or "discord" to send the reply back.
    """
    try:
        reply_text = await _process_inbox_message(req.message)
        if req.reply_to and reply_text:
            await messaging_reply_to(req.reply_to, reply_text)
        return {"success": True, "message": reply_text}
    except Exception as e:
        logger.exception("Command webhook failed")
        return {"success": False, "message": str(e)}


class InboxWebhookRequest(BaseModel):
    """Generic inbox: message from email gateway, bot, etc."""

    message: str
    reply_to: Optional[str] = None  # "telegram" | "discord" | "email"
    telegram_chat_id: Optional[str] = (
        None  # When reply_to=telegram, use this chat for reply (overrides default)
    )
    reply_email: Optional[str] = None  # When set, reply by email to this address


@app.post("/hooks/inbox")
async def hook_inbox(req: InboxWebhookRequest):
    """
    Process one inbound message (e.g. from email-to-webhook or a bot). Tries schedule then ask; optionally replies.
    Use reply_to + telegram_chat_id for Telegram; reply_email for email reply.
    """
    try:
        reply_text = await _process_inbox_message(req.message)
        if req.telegram_chat_id and reply_text:
            await messaging_reply_to_telegram_chat(req.telegram_chat_id, reply_text)
        elif req.reply_email and reply_text:
            await messaging_reply_to_email(req.reply_email, "Re: RoboFang", reply_text)
        elif req.reply_to and reply_text:
            if req.reply_to == "email" and req.reply_email:
                await messaging_reply_to_email(req.reply_email, "Re: RoboFang", reply_text)
            else:
                await messaging_reply_to(req.reply_to, reply_text)
        return {"success": True, "message": reply_text}
    except Exception as e:
        logger.exception("Inbox webhook failed")
        return {"success": False, "message": str(e)}


@app.post("/hooks/telegram")
async def hook_telegram(request: Request):
    """
    Telegram webhook: receives Update from Telegram, processes message, replies to the same chat.
    Set Telegram bot webhook URL to this endpoint (e.g. https://your-host/hooks/telegram). Requires HTTPS in production.
    """
    try:
        body = await request.json()
        message = body.get("message") or body.get("edited_message")
        if not message:
            return {"ok": True}
        text = (message.get("text") or "").strip()
        chat = message.get("chat", {})
        chat_id = chat.get("id")
        if not text or chat_id is None:
            return {"ok": True}
        reply_text = await _process_inbox_message(text)
        if reply_text:
            await messaging_reply_to_telegram_chat(str(chat_id), reply_text)
    except Exception:
        logger.exception("Telegram webhook failed")
    return {"ok": True}


class EmailWebhookRequest(BaseModel):
    """Payload from a mail-to-webhook gateway (e.g. SendGrid Inbound Parse, Mailgun)."""

    from_addr: str  # sender email for reply
    subject: Optional[str] = None
    body: str  # plain text body (command)


@app.post("/hooks/email")
async def hook_email(req: EmailWebhookRequest):
    """
    Email webhook: receive command from mail-to-webhook gateway. Process body, reply by email to from_addr.
    Configure your provider to POST here with from_addr, subject, body (e.g. parsed from incoming email).
    """
    try:
        reply_text = await _process_inbox_message((req.body or "").strip())
        if reply_text and req.from_addr:
            subject = (req.subject or "Re: RoboFang").strip()
            if not subject.lower().startswith("re:"):
                subject = f"Re: {subject}"
            await messaging_reply_to_email(req.from_addr, subject, reply_text)
        return {"success": True, "message": reply_text or ""}
    except Exception as e:
        logger.exception("Email webhook failed")
        return {"success": False, "message": str(e)}


# ---------------------------------------------------------------------------
# Onboarding / Comms settings (stored in orchestrator.storage secrets)
# ---------------------------------------------------------------------------


class CommsSettingsResponse(BaseModel):
    telegram_configured: bool
    discord_configured: bool
    email_configured: bool


class CommsSettingsRequest(BaseModel):
    telegram_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_webhook: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None
    imap_host: Optional[str] = None
    imap_port: Optional[str] = None
    imap_user: Optional[str] = None
    imap_password: Optional[str] = None
    imap_folder: Optional[str] = None


@app.get("/api/settings/comms", response_model=CommsSettingsResponse)
async def get_comms_settings():
    """Return whether comms are configured (masked). Used by onboarding/settings UI."""
    storage = orchestrator.storage
    telegram_env_configured = bool(
        (os.getenv("ROBOFANG_TELEGRAM_TOKEN") or "").strip()
        and (os.getenv("ROBOFANG_TELEGRAM_CHAT_ID") or "").strip()
    )
    smtp_ok, _ = messaging_is_email_configured()
    return CommsSettingsResponse(
        telegram_configured=bool(
            storage.get_secret("comms_telegram_token")
            and storage.get_secret("comms_telegram_chat_id")
        )
        or telegram_env_configured,
        discord_configured=bool(
            storage.get_secret("comms_discord_webhook") or os.getenv("ROBOFANG_DISCORD_WEBHOOK")
        ),
        email_configured=smtp_ok,
    )


@app.post("/api/settings/comms")
async def save_comms_settings(req: CommsSettingsRequest):
    """Save comms credentials from onboarding/settings UI. Stored in bridge storage. Empty string = leave unchanged."""
    storage = orchestrator.storage
    if req.telegram_token is not None and req.telegram_token.strip():
        storage.save_secret("comms_telegram_token", req.telegram_token.strip())
    if req.telegram_chat_id is not None and req.telegram_chat_id.strip():
        storage.save_secret("comms_telegram_chat_id", req.telegram_chat_id.strip())
    if req.discord_webhook is not None and req.discord_webhook.strip():
        storage.save_secret("comms_discord_webhook", req.discord_webhook.strip())
    for key, val in (
        ("comms_smtp_host", req.smtp_host),
        ("comms_smtp_port", req.smtp_port),
        ("comms_smtp_user", req.smtp_user),
        ("comms_smtp_password", req.smtp_password),
        ("comms_smtp_from", req.smtp_from),
        ("comms_imap_host", req.imap_host),
        ("comms_imap_port", req.imap_port),
        ("comms_imap_user", req.imap_user),
        ("comms_imap_password", req.imap_password),
        ("comms_imap_folder", req.imap_folder),
    ):
        if val is not None and str(val).strip():
            storage.save_secret(key, str(val).strip())

    orchestrator.storage.log_event("info", "settings", "comms_updated")
    return {"success": True}


# Fleet / GitHub owner (for catalog repo_urls and gh clone). Settings or ROBOFANG_GITHUB_OWNER.
def _fleet_github_owner() -> str:
    owner = (orchestrator.storage.get_secret("fleet_github_owner") or "").strip() or (
        os.getenv("ROBOFANG_GITHUB_OWNER") or ""
    ).strip()
    return owner or "sandraschi"


class FleetSettingsResponse(BaseModel):
    github_owner: str


class FleetSettingsRequest(BaseModel):
    github_owner: Optional[str] = None


@app.get("/api/settings/fleet", response_model=FleetSettingsResponse)
async def get_fleet_settings():
    """Return fleet settings (GitHub owner for catalog and installs). Used by settings UI."""
    return FleetSettingsResponse(github_owner=_fleet_github_owner())


@app.post("/api/settings/fleet")
async def save_fleet_settings(req: FleetSettingsRequest):
    """Save fleet GitHub owner. Stored in bridge storage; empty string = leave unchanged."""
    if req.github_owner is not None and req.github_owner.strip():
        orchestrator.storage.save_secret("fleet_github_owner", req.github_owner.strip())
        orchestrator.storage.log_event("info", "settings", "fleet_github_owner_updated")
    return {"success": True}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class AskRequest(BaseModel):
    message: str
    use_council: Optional[bool] = False
    use_rag: Optional[bool] = True
    subject: Optional[str] = "guest"
    persona: Optional[str] = "sovereign"
    priority: Optional[str] = "asap"  # asap | background (for future routing)


class AskResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class JournalPostRequest(BaseModel):
    content: str
    tags: Optional[str] = None


class ForumPostRequest(BaseModel):
    content: str
    author: Optional[str] = "guest"
    thread_id: Optional[int] = None


class MoltbookRegisterRequest(BaseModel):
    name: str
    bio: str
    personality: str
    goals: str


class SecurityPolicyRequest(BaseModel):
    subject: str
    role: str
    permissions: List[str]


class PersonaUpdateRequest(BaseModel):
    name: str
    system_prompt: str
    metadata: Optional[Dict[str, Any]] = None


class LaunchRequest(BaseModel):
    repo_path: str


def _hands_base_dir() -> Path:
    return Path(orchestrator.installer.hands_base_dir)


def _prepare_hand_webapp(repo_path: Path, webapp_dir: Path) -> None:
    """Install webapp deps before first launch: npm install in webapp (and frontend if present), uv sync at repo root. Log and continue on failure."""
    try:
        if (webapp_dir / "package.json").exists():
            r = subprocess.run(
                ["npm", "install"],
                cwd=str(webapp_dir),
                capture_output=True,
                text=True,
                timeout=300,
            )
            if r.returncode != 0:
                logger.warning("prepare webapp npm install (root): %s", r.stderr or r.stdout)
            else:
                logger.info("prepare webapp: npm install ok in %s", webapp_dir.name)
        frontend = webapp_dir / "frontend"
        if (frontend / "package.json").exists():
            r = subprocess.run(
                ["npm", "install"],
                cwd=str(frontend),
                capture_output=True,
                text=True,
                timeout=300,
            )
            if r.returncode != 0:
                logger.warning("prepare webapp npm install (frontend): %s", r.stderr or r.stdout)
            else:
                logger.info("prepare webapp: npm install ok in frontend")
        if (repo_path / "pyproject.toml").exists():
            r = subprocess.run(
                ["uv", "sync"],
                cwd=str(repo_path),
                capture_output=True,
                text=True,
                timeout=120,
            )
            if r.returncode != 0:
                logger.warning("prepare webapp uv sync: %s", r.stderr or r.stdout)
            else:
                logger.info("prepare webapp: uv sync ok at repo root")
    except subprocess.TimeoutExpired:
        logger.warning("prepare webapp timed out for %s", repo_path.name)
    except FileNotFoundError:
        logger.debug("prepare webapp: npm or uv not in PATH for %s", repo_path.name)
    except Exception as e:
        logger.warning("prepare webapp failed: %s", e)


@app.post("/api/fleet/launch-hand/{hand_id}")
async def launch_hand_webapp(hand_id: str):
    """Launch the webapp for an installed hand (web_sota/start.ps1 or webapp/start.ps1). Auto-prepares deps before first launch."""
    base = _hands_base_dir()
    path = (base / hand_id.strip()).resolve()
    try:
        path.relative_to(base.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid hand_id")
    if not path.exists() or not path.is_dir():
        raise HTTPException(status_code=404, detail=f"Hand '{hand_id}' not installed")
    meta = _read_repo_metadata(path)
    start_script: Optional[Path] = None
    if meta.get("webapp_script"):
        candidate = path / meta["webapp_script"].lstrip("/")
        if candidate.exists():
            start_script = candidate
    if not start_script or not start_script.exists():
        for rel in ("web_sota/start.ps1", "webapp/start.ps1", "web/start.ps1"):
            candidate = path / rel
            if candidate.exists():
                start_script = candidate
                break
    if not start_script or not start_script.exists():
        raise HTTPException(status_code=400, detail=f"No webapp start.ps1 found for {hand_id}")
    _prepare_hand_webapp(path, start_script.parent)
    try:
        subprocess.Popen(
            [
                "powershell.exe",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(start_script),
            ],
            cwd=str(path),
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        orchestrator.storage.log_event(
            "info",
            "fleet",
            "hand_webapp_launched",
            {"hand_id": hand_id, "path": str(path)},
        )
        return {"success": True, "message": f"Launched webapp for {hand_id}"}
    except Exception as e:
        logger.error("Launch hand webapp failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fleet/launch")
async def launch_app(request: LaunchRequest):
    """Launch another MCP app via its start.ps1 script."""
    path = Path(request.repo_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Path {request.repo_path} does not exist")

    # Security check
    allowed_base = Path("D:/Dev/repos")
    try:
        path.relative_to(allowed_base)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    start_script = path / "web_sota" / "start.ps1"
    if not start_script.exists():
        start_script = path / "web" / "start.ps1"
        if not start_script.exists():
            raise HTTPException(status_code=400, detail="No start.ps1 found")

    try:
        subprocess.Popen(
            [
                "powershell.exe",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(start_script),
            ],
            cwd=str(path),
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        orchestrator.storage.log_event(
            "info",
            "fleet",
            "app_launched",
            {"name": path.name, "path": str(path), "script": str(start_script)},
        )
        return {"success": True, "message": f"Launched {path.name}"}
    except Exception as e:
        logger.error(f"Launch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check():
    """Basic health probe — also returns connector states."""
    connector_states = {
        name: getattr(conn, "active", False) for name, conn in orchestrator.connectors.items()
    }
    return {
        "status": "healthy",
        "service": "RoboFang-bridge",
        "version": "0.3.0",
        "connectors": connector_states,
    }


@app.get("/system")
async def system_info():
    """Extended system info for the Status dashboard."""
    uptime_seconds = time.time() - _BRIDGE_START_TIME
    proc = psutil.Process(os.getpid())
    mem = proc.memory_info()

    connector_states = {}
    for name, conn in orchestrator.connectors.items():
        connector_states[name] = {
            "online": getattr(conn, "active", False),
            "type": getattr(conn, "connector_type", "connector"),
        }

    return {
        "status": "healthy",
        "service": "RoboFang-bridge",
        "version": "0.3.0",
        "pid": os.getpid(),
        "uptime_seconds": round(uptime_seconds),
        "started_at": _BRIDGE_START_TIME,
        "memory_mb": round(mem.rss / 1024 / 1024, 1),
        "connectors": connector_states,
        "connectors_online": sum(1 for v in connector_states.values() if v["online"]),
        "connectors_total": len(connector_states),
    }


@app.get("/fleet")
async def get_fleet():
    """
    Return the full fleet registry for the Fleet Control dashboard.

    Merges:
    - Live connectors (orchestrator.connectors) with real .active state
    - All connector entries from federation_map.json connectors section
    - All domain agents from federation_map.json domains
    """
    # 1. Live connector states
    live: dict = {}
    for name, conn in orchestrator.connectors.items():
        live[name] = {
            "id": name,
            "name": name.replace("-", " ").title(),
            "type": getattr(conn, "connector_type", "connector"),
            "status": "online" if getattr(conn, "active", False) else "offline",
            "source": "live",
            "domain": "connectors",
            "enabled": True,
            "repo_path": REPO_MAP.get(name) or "",
        }

    # 2. Federation map: connectors section — enrich with backend_url, frontend_url
    topology = orchestrator.topology
    conn_cfg: dict = topology.get("connectors", {})
    hands_base = _hands_base_dir()
    for name, cfg in conn_cfg.items():
        backend_url = cfg.get("mcp_backend") or MCP_BACKENDS.get(name) or ""
        frontend_url = cfg.get("mcp_frontend") or ""
        repo_path = REPO_MAP.get(name) or ""
        if not repo_path or not Path(repo_path).exists():
            hands_path = hands_base / f"{name}-mcp"
            if hands_path.exists() and hands_path.is_dir():
                repo_path = str(hands_path)
        if name in live:
            live[name]["enabled"] = cfg.get("enabled", False)
            live[name]["backend_url"] = backend_url
            live[name]["frontend_url"] = frontend_url
            live[name]["repo_path"] = repo_path or live[name].get("repo_path") or ""
            continue
        live[name] = {
            "id": name,
            "name": name.replace("-", " ").title(),
            "type": "connector",
            "status": "offline",
            "enabled": cfg.get("enabled", False),
            "source": "config",
            "domain": "connectors",
            "backend_url": backend_url,
            "frontend_url": frontend_url,
            "repo_path": repo_path,
        }
    # Backfill backend_url, repo_path, frontend_url for live connectors not in conn_cfg
    for name in list(live.keys()):
        if live[name].get("backend_url") in (None, ""):
            live[name]["backend_url"] = MCP_BACKENDS.get(name) or ""
        if live[name].get("frontend_url") is None:
            live[name]["frontend_url"] = conn_cfg.get(name, {}).get("mcp_frontend") or ""
        rp = live[name].get("repo_path") or REPO_MAP.get(name) or ""
        if not rp or not Path(rp).exists():
            hands_path = hands_base / f"{name}-mcp"
            if hands_path.exists() and hands_path.is_dir():
                rp = str(hands_path)
        live[name]["repo_path"] = rp

    # 3. Federation map: domains section
    domain_agents: list = []
    for domain_name, domain_entries in topology.get("domains", {}).items():
        for agent_id, agent_cfg in domain_entries.items():
            domain_agents.append(
                {
                    "id": f"{domain_name}/{agent_id}",
                    "name": agent_id.replace("-", " ").title(),
                    "type": "mcp-agent",
                    "status": "discovered",
                    "source": "federation",
                    "domain": domain_name,
                    "path": agent_cfg.get("path", ""),
                    "capabilities": agent_cfg.get("capabilities", []),
                }
            )

    # 4. Summary
    connectors_list = list(live.values())
    online_count = sum(1 for c in connectors_list if c["status"] == "online")

    return {
        "success": True,
        "summary": {
            "connectors_online": online_count,
            "connectors_total": len(connectors_list),
            "agents_discovered": len(domain_agents),
        },
        "connectors": connectors_list,
        "agents": domain_agents,
        "domains": list(topology.get("domains", {}).keys()),
    }


# ---------------------------------------------------------------------------
# /logs — ring buffer endpoint (new)
# ---------------------------------------------------------------------------


@app.get("/logs")
async def get_logs(
    level: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 100,
    since_id: Optional[str] = None,
):
    """
    Return bridge log entries from the in-memory ring buffer.

    Query params:
      level     — filter by level: debug|info|warn|error
      category  — filter by category: system|mcp|agent|auth
      source    — filter by source substring (case-insensitive)
      limit     — max entries to return (default 100, max 300)
      since_id  — return only entries after this id (for polling)
    """
    entries: list = list(_log_buffer)  # snapshot — deque to list

    # Optional filtering
    if level:
        entries = [e for e in entries if e["level"] == level]
    if category:
        entries = [e for e in entries if e["category"] == category]
    if source:
        src_lower = source.lower()
        entries = [e for e in entries if src_lower in e["source"].lower()]

    # since_id cursor — return only entries that come after the given id
    if since_id:
        try:
            idx = next(i for i, e in enumerate(entries) if e["id"] == since_id)
            entries = entries[idx + 1 :]
        except StopIteration:
            pass  # id not found — return all

    # Limit
    limit = min(max(1, limit), _LOG_BUFFER_SIZE)
    entries = entries[-limit:]

    return {
        "success": True,
        "count": len(entries),
        "buffer_size": _LOG_BUFFER_SIZE,
        "buffer_used": len(_log_buffer),
        "logs": entries,
        "latest_id": entries[-1]["id"] if entries else None,
    }


@app.get("/api/audit")
async def get_audit(limit: int = 100):
    """Retrieve persistent audit logs from RoboFang Storage."""
    logs = orchestrator.storage.get_audit_logs(limit=limit)
    return {"success": True, "count": len(logs), "audit_logs": logs}


@app.delete("/logs")
async def clear_logs():
    """Clear the in-memory log ring buffer."""
    _log_buffer.clear()
    logger.info("Log buffer cleared via API")
    return {"success": True, "message": "Log buffer cleared"}


# ---------------------------------------------------------------------------
# /deliberations — live reasoning stream (new)
# ---------------------------------------------------------------------------


@app.get("/deliberations")
async def get_deliberations(limit: int = 50, since_id: Optional[int] = None):
    """
    Return the live reasoning log from the orchestrator.
    Used by the Council Dashboard to visualize cognitive cycles.
    """
    entries = list(orchestrator.reasoning_log)

    if since_id:
        entries = [e for e in entries if e["id"] > since_id]

    limit = min(max(1, limit), 100)
    entries = entries[-limit:]

    return {
        "success": True,
        "count": len(entries),
        "deliberations": entries,
        "latest_id": entries[-1]["id"] if entries else None,
    }


# ---------------------------------------------------------------------------
# MCP tool discovery (FastMCP 3.1: /tools or /mcp/tools)
# ---------------------------------------------------------------------------

_TOOLS_PATHS = ("/tools", "/mcp/tools")


async def _fetch_mcp_tools(connector_id: str, base_url: str) -> List[Dict[str, Any]]:
    """Fetch tool list from a FastMCP 3.1 backend. Tries GET /tools then GET /mcp/tools. Returns list of {name, description}."""
    base = (base_url or "").rstrip("/")
    if not base:
        return []
    out: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=8.0) as client:
        for path in _TOOLS_PATHS:
            try:
                r = await client.get(f"{base}{path}")
                if r.status_code != 200:
                    continue
                data = r.json()
            except (httpx.ConnectError, httpx.TimeoutException, Exception):
                continue
            raw_list = (
                data
                if isinstance(data, list)
                else (data.get("tools") if isinstance(data, dict) else None)
            )
            if not raw_list:
                continue
            for t in raw_list:
                if isinstance(t, str):
                    out.append(
                        {
                            "name": t,
                            "description": f"MCP tool {t} ({connector_id}). FastMCP 3.1; use agentic_workflow for multi-step goals.",
                        }
                    )
                elif isinstance(t, dict):
                    name = t.get("name") or t.get("title")
                    if name:
                        desc = (
                            t.get("description")
                            or f"MCP tool {name} ({connector_id}). FastMCP 3.1; use agentic_workflow for multi-step goals."
                        )
                        out.append({"name": name, "description": desc})
            break
    return out


async def _refresh_mcp_tools_from_backends() -> None:
    """Discover tools from all known MCP backends and register them in the orchestrator for the council."""
    backends = _all_backend_urls()
    orchestrator.clear_mcp_tools()
    total = 0
    for connector_id, url in backends.items():
        tools = await _fetch_mcp_tools(connector_id, url)
        if tools:
            orchestrator.register_mcp_tools(connector_id, tools)
            total += len(tools)
    if total:
        logger.info(
            "MCP tool discovery: registered %d tools across %d connectors.", total, len(backends)
        )


# ---------------------------------------------------------------------------
# Backend URL resolution — topology (federation_map) then MCP_BACKENDS
# ---------------------------------------------------------------------------


def _backend_url_for_connector(connector_id: str) -> str:
    """Resolve connector backend URL: topology (federation_map) then MCP_BACKENDS."""
    cfg = orchestrator.topology.get("connectors", {}).get(connector_id) or {}
    return (cfg.get("mcp_backend") or MCP_BACKENDS.get(connector_id) or "").rstrip("/")


def _all_backend_urls() -> Dict[str, str]:
    """All known connector ids -> backend URL (topology then MCP_BACKENDS)."""
    conn_cfg = orchestrator.topology.get("connectors", {})
    out = {}
    for name in set(conn_cfg) | set(MCP_BACKENDS):
        url = _backend_url_for_connector(name)
        if url:
            out[name] = url
    return out


async def _invoke_connector_tool(
    connector_id: str, tool_name: str, params: Dict[str, Any]
) -> Dict[str, Any]:
    """Call a tool on an MCP backend. Tries POST /tool then POST /mcp/tools/call (FastMCP 3.1)."""
    base = _backend_url_for_connector(connector_id)
    if not base:
        return {"success": False, "error": f"Unknown connector: {connector_id}"}
    payload = {"name": tool_name, "arguments": params or {}}
    urls_to_try = [f"{base.rstrip('/')}/tool", f"{base.rstrip('/')}/mcp/tools/call"]
    last_error: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            for url in urls_to_try:
                try:
                    r = await client.post(url, json=payload)
                    if r.status_code == 404:
                        last_error = f"{url} returned 404"
                        continue
                    r.raise_for_status()
                    out = r.json()
                    if isinstance(out, dict) and "result" in out:
                        return (
                            out.get("result")
                            if isinstance(out.get("result"), dict)
                            else {"success": True, "data": out.get("result")}
                        )
                    return out if isinstance(out, dict) else {"success": True, "data": out}
                except httpx.HTTPStatusError:
                    last_error = f"{url} HTTP error"
                    continue
        return {"success": False, "error": last_error or "No endpoint responded"}
    except httpx.ConnectError as e:
        return {"success": False, "error": f"Backend unreachable: {e}"}
    except httpx.TimeoutException as e:
        return {"success": False, "error": f"Backend timeout: {e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Home Hub proxy routes  — /home/{connector}/{path}
# Thin reverse proxy: dashboard -> bridge (one CORS-safe origin) -> MCP backend
# ---------------------------------------------------------------------------


async def _proxy(connector: str, path: str, request: Request) -> Response:
    """Generic reverse proxy to an MCP backend."""
    base = _backend_url_for_connector(connector)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector}")

    url = f"{base}/{path}" if path else base
    method = request.method
    body = await request.body()
    headers = {
        k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(method, url, content=body, headers=headers)
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                media_type=resp.headers.get("content-type", "application/json"),
            )
    except httpx.ConnectError:
        return Response(
            content=f'{{"error":"MCP backend offline","connector":"{connector}","url":"{url}"}}',
            status_code=503,
            media_type="application/json",
        )
    except httpx.TimeoutException:
        return Response(
            content=f'{{"error":"MCP backend timeout","connector":"{connector}"}}',
            status_code=504,
            media_type="application/json",
        )


@app.api_route("/home/{connector}", methods=["GET", "POST", "PUT", "DELETE"])
async def home_connector_root(connector: str, request: Request):
    """Proxy to MCP backend root."""
    return await _proxy(connector, "", request)


@app.api_route("/home/{connector}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def home_connector_path(connector: str, path: str, request: Request):
    """Proxy to MCP backend sub-path."""
    return await _proxy(connector, path, request)


@app.get("/home")
async def home_status():
    """Return live reachability for all connectors (topology + MCP_BACKENDS)."""
    results = {}
    backends = _all_backend_urls()

    async def check_one(name, url):
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{url}/health")
                return name, {
                    "online": r.status_code < 500,
                    "status_code": r.status_code,
                    "url": url,
                }
        except Exception as e:
            return name, {
                "online": False,
                "error": str(e)[:120],
                "url": url,
            }

    tasks = [check_one(name, base_url) for name, base_url in backends.items()]
    stats = await asyncio.gather(*tasks)

    for name, data in stats:
        results[name] = data

    return {"success": True, "connectors": results}


# ---------------------------------------------------------------------------
# Existing routes (unchanged)
# ---------------------------------------------------------------------------


@app.post("/ask", response_model=AskResponse)
async def ask_question(req: AskRequest):
    try:
        result = await orchestrator.ask(
            req.message,
            use_council=req.use_council,
            use_rag=req.use_rag,
            subject=req.subject,
            persona=req.persona,
            priority=(req.priority or "asap"),
        )
        if result.get("success"):
            data = {"model": result.get("model")}
            if result.get("difficulty"):
                data["difficulty"] = result["difficulty"]
            return AskResponse(
                success=True,
                message=result.get("response", ""),
                data=data,
            )
        else:
            return AskResponse(
                success=False,
                message="Reasoning failed",
                error=result.get("error"),
            )
    except Exception as e:
        logger.error(f"Error in /ask route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/journal/post")
async def post_journal(req: JournalPostRequest):
    content = req.content
    if req.tags:
        content += f"\n\nTags: {req.tags}"
    try:
        result = await orchestrator.moltbook.post("/post", {"content": content})
        promoted = False
        if getattr(orchestrator, "journal_bridge", None):
            tags_list = [t.strip() for t in req.tags.split(",") if t.strip()] if req.tags else []
            entry = {
                "content": content,
                "tags": tags_list,
                "timestamp": datetime.now().isoformat(),
            }
            try:
                promoted = await orchestrator.journal_bridge.promote_to_adn(entry)
            except Exception as bridge_e:
                logger.warning("Journal promote_to_adn failed: %s", bridge_e)
        return {
            "success": result.get("success", False),
            "data": result,
            "adn_promoted": promoted,
        }
    except Exception as e:
        logger.error(f"Failed to post journal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/journal/recent")
async def get_journal_recent(limit: int = 10):
    """Return recent journal entries from ADN (#moltbridge). Requires advanced-memory connector."""
    try:
        if not getattr(orchestrator, "journal_bridge", None):
            return {"success": True, "entries": [], "source": "none"}
        entries = await orchestrator.journal_bridge.get_recent_entries(limit=min(limit, 100))
        return {"success": True, "entries": entries, "source": "adn"}
    except Exception as e:
        logger.warning("get_journal_recent failed: %s", e)
        return {"success": False, "entries": [], "error": str(e)}


@app.post("/moltbook/register")
async def register_agent(req: MoltbookRegisterRequest):
    try:
        res = await orchestrator.register_agent(req.model_dump())
        return res
    except Exception as e:
        logger.error(f"Failed to register agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/moltbook/feed")
async def get_feed():
    try:
        res = await orchestrator.get_moltbook_feed()
        return res
    except Exception as e:
        logger.error(f"Failed to fetch feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Private forum (local-only discussion; data never leaves the hub)
# ---------------------------------------------------------------------------


@app.post("/forum/post")
async def post_forum(req: ForumPostRequest):
    """Post to the private local forum. Stored in SQLite; no Moltbook cloud."""
    try:
        post_id = orchestrator.storage.save_forum_post(
            content=req.content,
            author=req.author or "guest",
            thread_id=req.thread_id,
        )
        return {"success": True, "id": post_id}
    except Exception as e:
        logger.error(f"Forum post failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forum/feed")
async def get_forum_feed(limit: int = 100):
    """Get recent private forum posts (newest first)."""
    try:
        posts = orchestrator.storage.get_forum_feed(limit=min(max(1, limit), 500))
        return {"success": True, "posts": posts}
    except Exception as e:
        logger.error(f"Forum feed failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/topology/rules")
async def get_routing_rules():
    try:
        rules = await orchestrator.get_routing_rules()
        return {"success": True, "rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/topology/rules")
async def update_routing_rule(channel: str, agent: str):
    try:
        ok = await orchestrator.update_routing(channel, agent)
        return {"success": ok}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FleetRegisterRequest(BaseModel):
    category: str  # 'nodes' or 'connectors'
    id: str
    config: Dict[str, Any]


@app.post("/api/fleet/register")
async def register_fleet_node(req: FleetRegisterRequest):
    """Dynamically register a new node or connector in the fleet."""
    try:
        updates = {req.category: {req.id: req.config}}
        if req.category == "connectors":
            # Ensure it's enabled by default if not specified
            if "enabled" not in req.config:
                req.config["enabled"] = True

        ok = orchestrator.update_topology(updates)
        orchestrator.storage.log_event(
            "info", "fleet", "node_registered", {"id": req.id, "category": req.category}
        )
        return {"success": ok, "message": f"Successfully registered {req.id} in {req.category}"}
    except Exception as e:
        logger.error(f"Failed to register fleet node: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fleet/discover")
async def fleet_discover(source: str = "registry", limit: int = 50):
    """
    Discover MCP servers from external sources: registry (MCP Registry API) or docker (Docker MCP catalog).
    Returns list of installable/catalog entries. For GitHub, use add-from-external with repo_url.
    """
    source = (source or "registry").lower()
    if source == "registry":
        items = await discover_registry(limit=min(limit, 100))
    elif source == "docker":
        items = discover_docker()
    else:
        raise HTTPException(
            status_code=400,
            detail="source must be 'registry' or 'docker'. For GitHub use POST /api/fleet/add-from-external.",
        )
    return {"success": True, "source": source, "items": items}


class AddFromExternalRequest(BaseModel):
    source: str  # "registry" | "docker" | "github"
    id: Optional[str] = None  # registry/docker server id
    repo_url: Optional[str] = None  # required for github; optional override for registry
    name: Optional[str] = None


@app.post("/api/fleet/add-from-external")
async def fleet_add_from_external(req: AddFromExternalRequest):
    """
    Add an MCP server to the fleet from an external source: registry (by id), or GitHub (by repo_url).
    Appends to fleet_manifest.yaml and runs install. Docker add not yet supported (discover only).
    """
    source = (req.source or "").strip().lower()
    if not source:
        raise HTTPException(status_code=400, detail="source is required")

    if source == "github":
        repo_url = normalize_github_repo_url(req.repo_url or "")
        if not repo_url:
            raise HTTPException(
                status_code=400, detail="repo_url is required and must be a GitHub repo URL"
            )
        hand_id = Path(repo_url).name.replace(".git", "")
        name = (req.name or hand_id).strip() or hand_id
        item = HandManifestItem(
            id=hand_id,
            name=name,
            category="External",
            description="Added from GitHub",
            repo_url=repo_url,
            install_script="start.ps1",
            tags=["external"],
        )
    elif source == "registry":
        if not req.id:
            raise HTTPException(status_code=400, detail="id is required for registry source")
        hand_id = req.id.strip()
        parts = hand_id.rsplit("-", 1)
        server_name = f"{parts[0]}/{parts[1]}" if len(parts) == 2 else hand_id
        repo_url = req.repo_url and req.repo_url.strip()
        if not repo_url:
            repo_url = await get_registry_server_repo(server_name)
        if not repo_url:
            raise HTTPException(
                status_code=400,
                detail="repo_url not found for this server; provide repo_url in request body.",
            )
        name = (req.name or hand_id).strip() or hand_id
        item = HandManifestItem(
            id=hand_id,
            name=name,
            category="External",
            description=f"From MCP Registry: {hand_id}",
            repo_url=repo_url,
            install_script="start.ps1",
            tags=["external", "registry"],
        )
    elif source == "docker":
        raise HTTPException(
            status_code=501,
            detail="Add from Docker not implemented; use discover then configure federation_map manually.",
        )
    else:
        raise HTTPException(status_code=400, detail="source must be registry, docker, or github")

    try:
        orchestrator.installer.add_hand_to_manifest(item)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    result = await orchestrator.onboard_hand(item.id)
    if not result.get("success"):
        logger.warning("Onboard hand after add-from-external: %s", result)
    return {
        "success": True,
        "message": f"Added {item.id} to fleet manifest and ran install.",
        "install_result": result,
    }


def _load_fleet_analysis() -> Dict[str, Any]:
    """Load fleet_analysis.json (written by scripts/analyze_fleet_fastmcp.py). Keys: hand_id -> fastmcp_version, mcpb_present."""
    try:
        base = _hands_base_dir()
        root = base.parent
        path = root / "fleet_analysis.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            raw = data.get("hands", {})
            if isinstance(raw, dict):
                return raw
            if isinstance(raw, list):
                return {item.get("id", ""): item for item in raw if item.get("id")}
            return {}
    except (OSError, json.JSONDecodeError):
        pass
    return {}


def _load_fleet_registry() -> List[Dict[str, Any]]:
    """Load fleet from registry JSON. Tries: (1) ROBOFANG_FLEET_REGISTRY, (2) repo configs/fleet-registry.json, (3) package-bundled configs. No dependency on mcp-central-docs."""
    paths_to_try: List[Path] = []
    env_path = (os.getenv("ROBOFANG_FLEET_REGISTRY") or "").strip()
    if env_path:
        paths_to_try.append(Path(env_path))
    mp = getattr(orchestrator.installer, "manifest_path", None)
    if mp is not None:
        paths_to_try.append(Path(mp).resolve().parent / "configs" / "fleet-registry.json")
    paths_to_try.append(Path(__file__).resolve().parent / "configs" / "fleet-registry.json")
    for path in paths_to_try:
        if path.exists() and path.is_file():
            try:
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
                fleet = data.get("fleet")
                if isinstance(fleet, list):
                    return fleet
            except (OSError, json.JSONDecodeError):
                continue
    return []


def _read_repo_metadata(repo_path: Path) -> Dict[str, Any]:
    """Read robofang.json and optionally llm.txt from repo root. Returns dict to merge into catalog/hand info."""
    out: Dict[str, Any] = {}
    if not repo_path.exists() or not repo_path.is_dir():
        return out
    jpath = repo_path / "robofang.json"
    if jpath.exists():
        try:
            with open(jpath, encoding="utf-8") as f:
                data = json.load(f)
            for key in ("name", "category", "description", "webapp_script", "ports"):
                if key in data and data[key] is not None:
                    out[key] = data[key]
        except (json.JSONDecodeError, OSError):
            pass
    lpath = repo_path / "llm.txt"
    if lpath.exists():
        try:
            with open(lpath, encoding="utf-8") as f:
                raw = f.read()
            for marker in ("## RoboFang", "## Integration", "## Robofang"):
                if marker in raw:
                    raw = raw.split(marker, 1)[1].strip().lstrip("\n")
                    break
            summary = (raw[:400] or "").strip()
            if summary:
                out["integration_summary"] = summary
        except OSError:
            pass
    return out


# Fallback when ROBOFANG_FLEET_REGISTRY is not set: curated MCP servers. Set ROBOFANG_FLEET_REGISTRY
# to path to fleet-registry.json (e.g. mcp-central-docs/operations/fleet-registry.json) for full fleet.
FLEET_CATALOG_GITHUB: List[Dict[str, Any]] = [
    {
        "id": "blender-mcp",
        "name": "Blender",
        "category": "Creative",
        "description": "3D creation and scene control.",
    },
    {
        "id": "gimp-mcp",
        "name": "GIMP",
        "category": "Creative",
        "description": "Image editing and assets.",
    },
    {"id": "svg-mcp", "name": "SVG", "category": "Creative", "description": "Vector graphics."},
    {
        "id": "vrchat-mcp",
        "name": "VRChat",
        "category": "Creative",
        "description": "VRChat world and avatar control.",
    },
    {
        "id": "avatar-mcp",
        "name": "Avatar / Resonite",
        "category": "Creative",
        "description": "Resonite and avatar OSC.",
    },
    {
        "id": "plex-mcp",
        "name": "Plex",
        "category": "Media",
        "description": "Media library and playback.",
    },
    {"id": "caliber-mcp", "name": "Calibre", "category": "Media", "description": "Ebook library."},
    {
        "id": "robotics-mcp",
        "name": "Robotics",
        "category": "Robotics",
        "description": "ROS 2, Yahboom, Unitree, Dreame.",
    },
    {
        "id": "noetix-bumi-mcp",
        "name": "Noetix Bumi",
        "category": "Robotics",
        "description": "Humanoid ROS 2.",
    },
    {
        "id": "virtualization-mcp",
        "name": "Virtualization",
        "category": "Infrastructure",
        "description": "VirtualBox / VM management.",
    },
    {
        "id": "advanced-memory-mcp",
        "name": "Advanced Memory",
        "category": "Knowledge",
        "description": "RAG and knowledge graph.",
    },
    {
        "id": "rustdesk-mcp",
        "name": "RustDesk",
        "category": "Infrastructure",
        "description": "Remote desktop.",
    },
    {"id": "osc-mcp", "name": "OSC", "category": "Creative", "description": "Open Sound Control."},
    {
        "id": "ring-mcp",
        "name": "Ring",
        "category": "Home",
        "description": "Ring doorbell and cameras.",
    },
    {
        "id": "tapo-camera-mcp",
        "name": "Tapo Camera",
        "category": "Home",
        "description": "TP-Link Tapo devices.",
    },
    {
        "id": "daw-mcp",
        "name": "DAW",
        "category": "Creative",
        "description": "Digital audio workstations.",
    },
    {
        "id": "home-assistant-mcp",
        "name": "Home Assistant",
        "category": "Home",
        "description": "Home automation and IoT.",
    },
    {
        "id": "notion-mcp",
        "name": "Notion",
        "category": "Knowledge",
        "description": "Notion workspace and docs.",
    },
    {
        "id": "obs-mcp",
        "name": "OBS",
        "category": "Creative",
        "description": "Streaming and recording.",
    },
    {
        "id": "davinci-resolve-mcp",
        "name": "DaVinci Resolve",
        "category": "Creative",
        "description": "Video editing and color.",
    },
    {
        "id": "reaper-mcp",
        "name": "REAPER",
        "category": "Creative",
        "description": "DAW and audio production.",
    },
    {
        "id": "resolume-mcp",
        "name": "Resolume",
        "category": "Creative",
        "description": "VJ and live visual performance.",
    },
    {
        "id": "netatmo-weather-mcp",
        "name": "Netatmo Weather",
        "category": "Home",
        "description": "Netatmo weather stations.",
    },
    {
        "id": "fastsearch-mcp",
        "name": "FastSearch",
        "category": "Knowledge",
        "description": "Fast local search and indexing.",
    },
    {
        "id": "database-operations-mcp",
        "name": "Database Operations",
        "category": "Infrastructure",
        "description": "DB admin and operations.",
    },
    {
        "id": "meta-mcp",
        "name": "Meta MCP",
        "category": "Infrastructure",
        "description": "MCP registry and meta tools.",
    },
    {
        "id": "vbox-mcp",
        "name": "VirtualBox",
        "category": "Infrastructure",
        "description": "VirtualBox VM management.",
    },
    {
        "id": "docker-mcp",
        "name": "Docker",
        "category": "Infrastructure",
        "description": "Docker containers and images.",
    },
    {
        "id": "tailscale-mcp",
        "name": "Tailscale",
        "category": "Infrastructure",
        "description": "Tailscale VPN and mesh.",
    },
    {
        "id": "monitoring-mcp",
        "name": "Monitoring",
        "category": "Infrastructure",
        "description": "Prometheus, Grafana, Loki.",
    },
]


def _fleet_catalog() -> List[Dict[str, Any]]:
    """Catalog = full fleet from registry (one JSON read) + manifest-only entries; dedupe by id. Enrich from disk only when installed."""
    seen: set = set()
    out: List[Dict[str, Any]] = []
    base = _hands_base_dir()
    owner = _fleet_github_owner()
    registry = _load_fleet_registry()

    if registry:
        analysis = _load_fleet_analysis()
        for r in registry:
            hand_id = (r.get("id") or "").strip()
            if not hand_id or hand_id in seen:
                continue
            seen.add(hand_id)
            path = base / hand_id
            installed = path.exists() and path.is_dir()
            repo_path = (r.get("repo_path") or "").strip()
            entry = {
                "id": hand_id,
                "name": (r.get("name") or hand_id)[:100],
                "category": (r.get("category") or "Other")[:50],
                "description": (r.get("description") or "")[:200],
                "port": r.get("port", 0),
                "repo_path": repo_path,
                "repo_url": f"https://github.com/{owner}/{hand_id}",
                "installed": installed,
                "icon": (r.get("icon") or "")[:50],
            }
            if r.get("requires_app"):
                entry["requires_app"] = str(r["requires_app"])[:80]
            if r.get("app_install_url"):
                entry["app_install_url"] = str(r["app_install_url"])[:500]
            if installed:
                meta = _read_repo_metadata(path)
                if meta.get("name"):
                    entry["name"] = str(meta["name"])[:100]
                if meta.get("category"):
                    entry["category"] = str(meta["category"])[:50]
                if meta.get("description"):
                    entry["description"] = str(meta["description"])[:200]
                if meta.get("integration_summary"):
                    entry["integration_summary"] = meta["integration_summary"]
                if meta.get("webapp_script"):
                    entry["webapp_script"] = meta["webapp_script"]
                if meta.get("ports"):
                    entry["ports"] = meta["ports"]
                if not entry.get("repo_path") and path:
                    entry["repo_path"] = str(path)
            a = analysis.get(hand_id, {})
            if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
                entry["fastmcp_version"] = a["fastmcp_version"]
            entry["mcpb_present"] = a.get("mcpb_present", False)
            out.append(entry)
        manifest = orchestrator.installer.get_manifest()
        for h in manifest:
            if h.id in seen:
                continue
            seen.add(h.id)
            path = base / h.id
            installed = path.exists() and path.is_dir()
            entry = {
                "id": h.id,
                "name": h.name,
                "category": h.category or "Other",
                "description": (h.description or "")[:200],
                "port": 0,
                "repo_path": str(path) if installed else "",
                "repo_url": h.repo_url,
                "installed": installed,
            }
            if installed:
                meta = _read_repo_metadata(path)
                if meta.get("name"):
                    entry["name"] = str(meta["name"])[:100]
                if meta.get("category"):
                    entry["category"] = str(meta["category"])[:50]
                if meta.get("description"):
                    entry["description"] = str(meta["description"])[:200]
                if meta.get("integration_summary"):
                    entry["integration_summary"] = meta["integration_summary"]
                if meta.get("webapp_script"):
                    entry["webapp_script"] = meta["webapp_script"]
                if meta.get("ports"):
                    entry["ports"] = meta["ports"]
            a = analysis.get(h.id, {})
            if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
                entry["fastmcp_version"] = a["fastmcp_version"]
            entry["mcpb_present"] = a.get("mcpb_present", False)
            out.append(entry)
        return out

    analysis = _load_fleet_analysis()
    for h in orchestrator.installer.get_manifest():
        entry = {
            "id": h.id,
            "name": h.name,
            "category": h.category or "Other",
            "description": (h.description or "")[:200],
            "repo_url": h.repo_url,
        }
        path = base / h.id
        if path.exists() and path.is_dir():
            meta = _read_repo_metadata(path)
            if meta.get("name"):
                entry["name"] = str(meta["name"])[:100]
            if meta.get("category"):
                entry["category"] = str(meta["category"])[:50]
            if meta.get("description"):
                entry["description"] = str(meta["description"])[:200]
            if meta.get("integration_summary"):
                entry["integration_summary"] = meta["integration_summary"]
            if meta.get("webapp_script"):
                entry["webapp_script"] = meta["webapp_script"]
            if meta.get("ports"):
                entry["ports"] = meta["ports"]
        a = analysis.get(h.id, {})
        if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
            entry["fastmcp_version"] = a["fastmcp_version"]
        entry["mcpb_present"] = a.get("mcpb_present", False)
        entry["installed"] = path.exists() and path.is_dir()
        out.append(entry)
        seen.add(h.id)
    for c in FLEET_CATALOG_GITHUB:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        installed_path = (base / c["id"]).exists() and (base / c["id"]).is_dir()
        repo_url = f"https://github.com/{owner}/{c['id']}"
        entry = {
            **c,
            "repo_url": repo_url,
            "description": (c.get("description") or "")[:200],
            "installed": installed_path,
        }
        a = analysis.get(c["id"], {})
        if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
            entry["fastmcp_version"] = a["fastmcp_version"]
        entry["mcpb_present"] = a.get("mcpb_present", False)
        out.append(entry)
    return out


@app.get("/api/fleet/hand/{hand_id}/info")
async def fleet_hand_info(hand_id: str):
    """Return manifest entry plus repo metadata (robofang.json + llm.txt) when hand is installed."""
    hand_id = hand_id.strip()
    hands = [h for h in orchestrator.installer.get_manifest() if h.id == hand_id]
    if not hands:
        raise HTTPException(status_code=404, detail=f"Hand '{hand_id}' not in manifest")
    h = hands[0]
    entry = {
        "id": h.id,
        "name": h.name,
        "category": h.category or "Other",
        "description": (h.description or "")[:200],
        "repo_url": h.repo_url,
    }
    base = _hands_base_dir()
    path = base / hand_id
    if path.exists() and path.is_dir():
        meta = _read_repo_metadata(path)
        if meta.get("name"):
            entry["name"] = meta["name"]
        if meta.get("category"):
            entry["category"] = meta["category"]
        if meta.get("description"):
            entry["description"] = meta["description"]
        if meta.get("integration_summary"):
            entry["integration_summary"] = meta["integration_summary"]
        if meta.get("webapp_script"):
            entry["webapp_script"] = meta["webapp_script"]
        if meta.get("ports"):
            entry["ports"] = meta["ports"]
    a = _load_fleet_analysis().get(hand_id, {})
    if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
        entry["fastmcp_version"] = a["fastmcp_version"]
    entry["mcpb_present"] = a.get("mcpb_present", False)
    return {"success": True, "hand": entry}


@app.get("/api/fleet/manifest")
async def fleet_manifest():
    """Return installable hands from fleet_manifest.yaml (for backward compat)."""
    hands = orchestrator.installer.get_manifest()
    return {
        "success": True,
        "hands": [
            {
                "id": h.id,
                "name": h.name,
                "category": h.category,
                "description": (h.description or "")[:200],
                "repo_url": h.repo_url,
            }
            for h in hands
        ],
    }


def _hand_id_to_connector(hand_id: str) -> str:
    """Map fleet catalog hand_id (e.g. blender-mcp) to connector id (e.g. blender) for MCP_BACKENDS/REPO_MAP."""
    if hand_id.endswith("-mcp"):
        return hand_id[:-4]
    return hand_id


def _port_from_url(url: str) -> int:
    """Extract port from http://host:port or http://host. Default 0."""
    if not url:
        return 0
    try:
        from urllib.parse import urlparse as _urlparse

        parsed = _urlparse(url)
        if parsed.port is not None:
            return parsed.port
        return 80 if parsed.scheme == "http" else 443
    except Exception:
        return 0


def _fleet_installer_catalog() -> List[Dict[str, Any]]:
    """Installer catalog: full fleet with port and repo_path for Fleet Installer UI. Uses registry port/repo_path when present."""
    catalog = []
    base = _hands_base_dir()
    for entry in _fleet_catalog():
        hand_id = entry.get("id", "")
        conn_id = _hand_id_to_connector(hand_id)
        port = entry.get("port", 0) or _port_from_url(MCP_BACKENDS.get(conn_id) or "")
        if not port and isinstance(entry.get("ports"), dict):
            port = entry["ports"].get("backend") or entry["ports"].get("mcp") or 0
        repo_path = (entry.get("repo_path") or "").strip()
        if not repo_path and entry.get("installed") and (base / hand_id).exists():
            repo_path = str(base / hand_id)
        if not repo_path:
            repo_path = REPO_MAP.get(conn_id) or ""
        catalog.append(
            {
                "id": hand_id,
                "name": entry.get("name", hand_id),
                "description": (entry.get("description") or "")[:300],
                "port": port,
                "repo_path": repo_path,
                "icon": entry.get("icon") or "",
                "category": entry.get("category") or "Other",
            }
        )
    return catalog


@app.get("/api/fleet/catalog")
async def fleet_catalog() -> JSONResponse:
    """Catalog from fleet registry (ROBOFANG_FLEET_REGISTRY) when set, else manifest + fallback list. One JSON read + minimal I/O. Always 200 + JSON."""
    try:
        hands = _fleet_catalog()
        catalog = _fleet_installer_catalog()
        return JSONResponse(
            status_code=200,
            content={"success": True, "hands": hands, "catalog": catalog},
        )
    except Exception as e:
        err_msg = str(e)
        logger.exception("Fleet catalog failed: %s", err_msg)
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "hands": [],
                "catalog": [],
                "error": err_msg,
            },
        )


@app.get("/api/fleet/installer-paths")
async def fleet_installer_paths():
    """Debug: where Fleet Installer writes manifest and clones repos. Use ROBOFANG_FLEET_MANIFEST/ROBOFANG_HANDS_DIR if installs fail."""
    mp = getattr(orchestrator.installer, "manifest_path", None)
    hb = getattr(orchestrator.installer, "hands_base_dir", None)
    manifest_path = str(mp) if mp else ""
    hands_dir = str(hb) if hb else ""
    manifest_exists = mp is not None and mp.exists()
    manifest_writable = False
    if mp is not None:
        try:
            mp.parent.mkdir(parents=True, exist_ok=True)
            if mp.exists():
                with open(mp, "a", encoding="utf-8"):
                    pass
                manifest_writable = True
            else:
                test = mp.parent / ".write_test_robofang"
                test.write_text("", encoding="utf-8")
                test.unlink(missing_ok=True)
                manifest_writable = True
        except OSError:
            pass
    return {
        "success": True,
        "manifest_path": manifest_path,
        "hands_dir": hands_dir,
        "manifest_exists": manifest_exists,
        "manifest_writable": manifest_writable,
        "hint": "If installs fail, set ROBOFANG_FLEET_MANIFEST and ROBOFANG_HANDS_DIR to writable paths (e.g. repo root) and restart the bridge.",
    }


class CatalogItemForInstall(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    repo_url: str


class OnboardFromGitHubRequest(BaseModel):
    """Install selected items from catalog by repo_url (clone from GitHub)."""

    items: List[CatalogItemForInstall]


@app.post("/api/fleet/onboard-from-github")
async def fleet_onboard_from_github(req: OnboardFromGitHubRequest):
    """Install each selected item: add to manifest and clone from GitHub."""
    if not req.items:
        return {"success": True, "results": [], "message": "No items selected."}
    results = []
    for item in req.items:
        repo_url = (item.repo_url or "").strip()
        if not repo_url:
            results.append(
                {"hand_id": item.id or "", "success": False, "message": "Missing repo_url"}
            )
            continue
        try:
            hand_id = (item.id or Path(repo_url).name.replace(".git", "")).strip()
            name = (item.name or hand_id).strip() or hand_id
            add_item = HandManifestItem(
                id=hand_id,
                name=name,
                category=item.category or "External",
                description=item.description or "Added from GitHub",
                repo_url=repo_url,
                install_script="start.ps1",
                tags=["external"],
            )
            orchestrator.installer.add_hand_to_manifest(add_item)
            result = await orchestrator.onboard_hand(hand_id)
            results.append(
                {
                    "hand_id": hand_id,
                    "success": result.get("success", False),
                    "message": result.get("message") or result.get("error"),
                }
            )
        except ValueError as e:
            results.append({"hand_id": item.id or "", "success": False, "message": str(e)})
        except Exception as e:
            results.append({"hand_id": item.id or "", "success": False, "message": str(e)})
    return {"success": True, "results": results}


class OnboardRequest(BaseModel):
    hand_ids: List[str]


def _install_preflight() -> Optional[str]:
    """Return None if OK, else an error message (gh missing or paths not writable)."""
    import shutil

    if shutil.which("gh") is None:
        return "GitHub CLI (gh) not found in PATH. Install from https://cli.github.com/ and ensure gh is on PATH."
    mp = getattr(orchestrator.installer, "manifest_path", None)
    hb = getattr(orchestrator.installer, "hands_base_dir", None)
    if mp is None:
        return "Installer not configured (no manifest path). Run start_all.ps1 from repo root."
    try:
        mp.parent.mkdir(parents=True, exist_ok=True)
        if mp.exists():
            with open(mp, "a", encoding="utf-8"):
                pass
        else:
            (mp.parent / ".robofang_write_test").write_text("", encoding="utf-8")
            (mp.parent / ".robofang_write_test").unlink(missing_ok=True)
    except OSError as e:
        return (
            "Manifest path not writable: %s. Run start_all.ps1 from repo root (sets ROBOFANG_FLEET_MANIFEST and ROBOFANG_HANDS_DIR)."
            % e
        )
    if hb is not None:
        try:
            hb.mkdir(parents=True, exist_ok=True)
            test = hb / ".robofang_write_test"
            test.write_text("", encoding="utf-8")
            test.unlink(missing_ok=True)
        except OSError as e:
            return "Hands dir not writable: %s. Run start_all.ps1 from repo root." % e
    return None


@app.post("/api/fleet/onboard")
async def fleet_onboard(req: OnboardRequest):
    """Install selected hands (add to manifest from catalog if needed, then clone + optional install script)."""
    if not req.hand_ids:
        return {"success": True, "results": [], "message": "No hands selected."}
    preflight = _install_preflight()
    if preflight:
        return {
            "success": False,
            "results": [
                {"hand_id": hid.strip(), "success": False, "message": preflight}
                for hid in req.hand_ids
            ],
            "message": preflight,
        }
    manifest_ids = {h.id for h in orchestrator.installer.get_manifest()}
    results = []
    for hand_id in req.hand_ids:
        hand_id = hand_id.strip()
        if hand_id not in manifest_ids:
            catalog_entry = next((c for c in FLEET_CATALOG_GITHUB if c.get("id") == hand_id), None)
            if not catalog_entry:
                results.append(
                    {
                        "hand_id": hand_id,
                        "success": False,
                        "message": "Hand not in catalog. Refresh the Installer list.",
                    }
                )
                continue
            owner = _fleet_github_owner()
            repo_url = f"https://github.com/{owner}/{hand_id}"
            try:
                orchestrator.installer.add_hand_to_manifest(
                    HandManifestItem(
                        id=hand_id,
                        name=catalog_entry.get("name", hand_id),
                        category=catalog_entry.get("category", "Other"),
                        description=catalog_entry.get("description", ""),
                        repo_url=repo_url,
                        install_script="start.ps1",
                        tags=["catalog"],
                    )
                )
                manifest_ids.add(hand_id)
            except (ValueError, OSError) as e:
                results.append({"hand_id": hand_id, "success": False, "message": str(e)})
                continue
        result = await orchestrator.onboard_hand(hand_id)
        results.append(
            {
                "hand_id": hand_id,
                "success": result.get("success", False),
                "message": result.get("message") or result.get("error"),
            }
        )
        if result.get("success"):
            conn_id = _hand_id_to_connector(hand_id)
            try:
                orchestrator.update_topology(
                    {
                        "connectors": {
                            conn_id: {
                                "enabled": True,
                                "mcp_backend": MCP_BACKENDS.get(conn_id) or "",
                            }
                        }
                    }
                )
                logger.info("Registered connector %s in topology after install.", conn_id)
            except Exception as e:
                logger.warning("Failed to register connector %s after install: %s", conn_id, e)
    return {"success": True, "results": results}


class CommsSettingsRequest(BaseModel):
    telegram_token: Optional[str] = None
    discord_token: Optional[str] = None
    discord_channel: Optional[str] = None


@app.post("/api/settings/comms")
async def update_comms_settings(req: CommsSettingsRequest):
    """Update telegram and discord connector settings in the topology."""
    try:
        updates = {"connectors": {}}
        if req.telegram_token:
            updates["connectors"]["telegram"] = {"token": req.telegram_token, "enabled": True}

        if req.discord_token:
            updates["connectors"]["discord"] = {
                "token": req.discord_token,
                "channel_id": req.discord_channel,
                "enabled": True,
            }

        if updates["connectors"]:
            ok = orchestrator.update_topology(updates)
            return {"success": ok}
        return {"success": True, "message": "No updates provided"}
    except Exception as e:
        logger.error(f"Failed to update comms settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/skills")
async def list_skills():
    try:
        skills = await orchestrator.list_skills()
        return {"success": True, "skills": skills}
    except Exception as e:
        logger.error(f"Failed to list skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SkillRunRequest(BaseModel):
    skill_id: str
    message: str


@app.post("/skills/run")
async def run_skill_augmented(req: SkillRunRequest):
    try:
        result = await orchestrator.run_skill(req.skill_id, req.message)
        if result.get("success"):
            return AskResponse(
                success=True,
                message=result.get("response", ""),
                data={"model": result.get("model"), "skill_id": req.skill_id},
            )
        else:
            return AskResponse(
                success=False,
                message="Skill execution failed",
                error=result.get("error"),
            )
    except Exception as e:
        logger.error(f"Error in /skills/run route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/security/policy")
async def define_security_policy(req: SecurityPolicyRequest):
    try:
        orchestrator.security.define_policy(req.subject, req.role, req.permissions)
        return {"success": True, "message": f"Policy for {req.subject} updated."}
    except Exception as e:
        logger.error(f"Failed to update security policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/security/policy/{subject}")
async def get_security_policy(subject: str):
    policy = orchestrator.security.get_subject_policy(subject)
    if not policy:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"success": True, "policy": policy}


@app.post("/personality/persona")
async def update_persona(req: PersonaUpdateRequest):
    try:
        orchestrator.personality.add_persona(req.name, req.system_prompt)
        return {"success": True, "message": f"Persona {req.name} updated."}
    except Exception as e:
        logger.error(f"Failed to update persona: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/personality/personas")
async def list_personas():
    return {"success": True, "personas": orchestrator.personality.list_personas()}


# ---------------------------------------------------------------------------
# Local LLM (Ollama) proxy — model list and load for dashboard
# ---------------------------------------------------------------------------

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")


@app.get("/api/llm/models")
async def api_llm_models():
    """Proxy to Ollama /api/tags for model list (dashboard LLM page)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama unreachable at {OLLAMA_URL}. Is it running?",
        )
    except Exception as e:
        logger.exception("api_llm_models failed")
        raise HTTPException(status_code=502, detail=str(e))


class LlmLoadRequest(BaseModel):
    name: str


@app.post("/api/llm/load")
async def api_llm_load(req: LlmLoadRequest):
    """Proxy to Ollama /api/load to load a model into memory."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{OLLAMA_URL}/api/load",
                json={"name": req.name},
            )
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama unreachable at {OLLAMA_URL}.",
        )
    except Exception as e:
        logger.exception("api_llm_load failed")
        raise HTTPException(status_code=502, detail=str(e))


class LlmGenerateRequest(BaseModel):
    model: str
    prompt: str
    stream: Optional[bool] = False


@app.post("/api/llm/generate")
async def api_llm_generate(req: LlmGenerateRequest):
    """Proxy to Ollama /api/generate for inference test (dashboard LLM page)."""
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            r = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": req.model,
                    "prompt": req.prompt,
                    "stream": req.stream or False,
                },
            )
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama unreachable at {OLLAMA_URL}.",
        )
    except Exception as e:
        logger.exception("api_llm_generate failed")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/help")
async def api_help():
    """Structured help for MCP tools, council, connection, skills (dashboard Help page)."""
    return get_help_content()


# ── Diagnostic Triage (New SOTA-2026 Substrate) ──────────────────────────

MCP_SERVER_URL = "http://localhost:10867"


@app.get("/api/diagnostics/heartbeat")
async def get_mcp_heartbeat():
    """Proxy substrate heartbeat from the local MCP server."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{MCP_SERVER_URL}/heartbeat")
            return resp.json()
    except Exception as e:
        logger.error(f"Failed to reach MCP substrate: {e}")
        return {"status": "OFFLINE", "error": str(e)}


@app.post("/api/diagnostics/forensics")
async def run_mcp_forensics():
    """Trigger agentic forensics via the substrate."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{MCP_SERVER_URL}/forensics")
            return resp.json()
    except Exception as e:
        logger.error(f"Forensic sweep failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Autonomous Hands API (New SOTA-2026 Evolution) ─────────────────────────


@app.get("/api/hands")
async def list_hands():
    """List all registered autonomous hands and their status."""
    return {"success": True, "hands": orchestrator.hands.get_hands_status()}


@app.post("/api/hands/{hand_id}/activate")
async def activate_hand(hand_id: str):
    """Activate a specific autonomous hand."""
    if hand_id not in orchestrator.hands.hands:
        raise HTTPException(status_code=404, detail=f"Hand {hand_id} not found")
    orchestrator.hands.hands[hand_id].activate()
    return {"success": True, "message": f"Hand {hand_id} activated"}


@app.post("/api/hands/{hand_id}/pause")
async def pause_hand(hand_id: str):
    """Pause a specific autonomous hand."""
    if hand_id not in orchestrator.hands.hands:
        raise HTTPException(status_code=404, detail=f"Hand {hand_id} not found")
    orchestrator.hands.hands[hand_id].pause()
    return {"success": True, "message": f"Hand {hand_id} paused"}


# ── Routines API (e.g. "dawn patrol 7am daily") ──────────────────────────


@app.get("/api/routines")
async def api_list_routines():
    """List all stored routines (scheduled actions)."""
    return {"success": True, "routines": orchestrator.list_routines()}


class RoutineFromPhraseRequest(BaseModel):
    phrase: str
    report_email: Optional[str] = None
    run_now: Optional[bool] = False


@app.post("/api/routines/from-phrase")
async def api_routines_from_phrase(req: RoutineFromPhraseRequest):
    """
    Parse natural language (e.g. 'dawn patrol 7am daily', 'yahboom robot patrol and report anomalies') and create a routine.
    If run_now=true, run the routine immediately and return run result (e.g. patrol report).
    """
    prompt = (
        "Extract a scheduled routine from this user message. Reply with ONLY a JSON object, no markdown.\n"
        "Fields: name (short label), time_local (HH:MM 24h), recurrence (daily|weekly), "
        "action_type (use 'dawn_patrol' for patrol with video and report).\n"
        'Example: {"name": "dawn patrol", "time_local": "07:00", "recurrence": "daily", "action_type": "dawn_patrol"}\n'
        f"User message: {req.phrase}"
    )
    try:
        result = await orchestrator.ask(
            prompt,
            use_council=False,
            use_rag=False,
            subject="guest",
            persona="sovereign",
        )
        if not result.get("success"):
            return {"success": False, "error": result.get("error", "Parse failed")}
        raw = result.get("response", "").strip()
        for start in ("{", "```json"):
            if start in raw:
                raw = raw[raw.index(start) :]
                break
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
        data = json.loads(raw)
        name = data.get("name") or "routine"
        time_local = data.get("time_local") or "07:00"
        recurrence = data.get("recurrence") or "daily"
        action_type = data.get("action_type") or "dawn_patrol"
        params = {}
        if req.report_email:
            params["report_email"] = req.report_email
        routine = orchestrator.create_routine(
            name=name,
            time_local=time_local,
            recurrence=recurrence,
            action_type=action_type,
            params=params,
        )
        if req.run_now:
            run_result = await orchestrator.run_routine(routine["id"])
            return {"success": True, "routine": routine, "run_result": run_result}
        return {"success": True, "routine": routine}
    except json.JSONDecodeError as e:
        logger.warning("Routine parse JSON failed: %s", e)
        return {"success": False, "error": f"Could not parse LLM response as JSON: {e}"}
    except Exception as e:
        logger.exception("Routines from-phrase failed")
        return {"success": False, "error": str(e)}


@app.get("/api/routines/{routine_id}")
async def api_get_routine(routine_id: str):
    """Get a single routine by id."""
    routine = orchestrator.get_routine(routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail=f"Routine {routine_id} not found")
    return {"success": True, "routine": routine}


class RoutineUpdateRequest(BaseModel):
    name: Optional[str] = None
    time_local: Optional[str] = None
    recurrence: Optional[str] = None
    action_type: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


@app.patch("/api/routines/{routine_id}")
async def api_update_routine(routine_id: str, req: RoutineUpdateRequest):
    """Update a routine (partial)."""
    routine = orchestrator.update_routine(
        routine_id,
        name=req.name,
        time_local=req.time_local,
        recurrence=req.recurrence,
        action_type=req.action_type,
        params=req.params,
        enabled=req.enabled,
    )
    if not routine:
        raise HTTPException(status_code=404, detail=f"Routine {routine_id} not found")
    return {"success": True, "routine": routine}


@app.delete("/api/routines/{routine_id}")
async def api_delete_routine(routine_id: str):
    """Delete a routine by id."""
    if not orchestrator.delete_routine(routine_id):
        raise HTTPException(status_code=404, detail=f"Routine {routine_id} not found")
    return {"success": True, "message": f"Routine {routine_id} deleted"}


@app.post("/api/routines/{routine_id}/run")
async def api_run_routine(routine_id: str):
    """Manually trigger a routine once (e.g. for testing)."""
    result = await orchestrator.run_routine(routine_id)
    return result


@app.get("/api/docs")
async def list_docs():
    """List available documentation files from the docs/ directory."""
    docs_dir = Path("D:/Dev/repos/robofang/docs")
    if not docs_dir.exists():
        return {"success": False, "error": "Docs directory not found"}

    docs = []
    for f in docs_dir.glob("*.md"):
        docs.append(
            {
                "slug": f.stem,
                "title": f.stem.replace("_", " ").replace("-", " ").title(),
                "path": str(f),
            }
        )
    return {"success": True, "docs": docs}


@app.get("/api/docs/{slug}")
async def get_doc(slug: str):
    """Fetch and return the content of a specific documentation file."""
    doc_path = Path(f"D:/Dev/repos/robofang/docs/{slug}.md")
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Documentation not found: {slug}")

    try:
        content = doc_path.read_text(encoding="utf-8")
        return {
            "success": True,
            "slug": slug,
            "title": slug.replace("_", " ").replace("-", " ").title(),
            "content": content,
        }
    except Exception as e:
        logger.error(f"Failed to read doc {slug}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def main():
    """Entry point for the robofang-bridge script."""
    try:
        port = int(os.getenv("PORT", 10871))
        host = os.getenv("ROBOFANG_BRIDGE_HOST", "0.0.0.0")
        uvicorn.run("robofang.main:app", host=host, port=port, reload=False)
    except Exception:
        traceback.print_exc(file=sys.stderr)
        sys.stderr.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()
