import asyncio
import collections
import json
import logging
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Any, ClassVar, Dict, List, Optional

import httpx
import psutil
import uvicorn
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
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
from robofang.messaging import reply_to as messaging_reply_to
from robofang.messaging import set_comms_storage
from robofang.plugins.collector_hand import CollectorHand
from robofang.plugins.robotics_hand import RoboticsHand
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("robofang.main")

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
    "obs": "http://localhost:10819",
    "davinci-resolve": "http://localhost:10843",
    "reaper": "http://localhost:10797",
    "resolume": "http://localhost:10770",
    "vrchat": "http://localhost:10712",
    # Wave 3 — Infrastructure
    "virtualization": "http://localhost:10700",
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


# ---------------------------------------------------------------------------
# Repository Mapping for SOTA Launch Logic
# ---------------------------------------------------------------------------


app = FastAPI(
    title="RoboFang Sovereign Bridge",
    version="0.3.0",
)


@app.on_event("startup")
async def startup_event():
    """Manage orchestrator lifecycle and auto-launch enabled fleet nodes."""
    logger.info("RoboFang Bridge starting up...")
    orchestrator.storage.log_event("info", "bridge", "startup_initiated")
    await auto_launch_enabled_connectors()
    await asyncio.sleep(8)
    await orchestrator.start()
    orchestrator.storage.log_event("info", "bridge", "startup_complete")


async def auto_launch_enabled_connectors():
    """Iterates through topology and triggers launch for enabled connectors."""
    logger.info("Fleet Automation: Identifying enabled connectors for auto-launch...")
    topology = orchestrator.topology
    connectors = topology.get("connectors", {})

    for name, cfg in connectors.items():
        if isinstance(cfg, dict) and cfg.get("enabled"):
            if name in REPO_MAP:
                logger.info(f"Fleet Automation: Triggering auto-launch for '{name}'")
                try:
                    await launch_connector(name)
                except Exception as e:
                    logger.error(f"Fleet Automation: Auto-launch failed for '{name}': {e}")
            else:
                logger.warning(
                    f"Fleet Automation: Connector '{name}' is enabled but no REPO_MAP entry found."
                )


@app.on_event("shutdown")
async def shutdown_event():
    """Manage orchestrator lifecycle."""
    logger.info("RoboFang Bridge shutting down...")
    await orchestrator.stop()


# ---------------------------------------------------------------------------
# Repository Mapping for SOTA Launch Logic
# ---------------------------------------------------------------------------

REPO_MAP: Dict[str, str] = {
    # Home / Media
    "plex": "d:/Dev/repos/plex-mcp",
    "calibre": "d:/Dev/repos/calibre-mcp",
    "home-assistant": "d:/Dev/repos/home-assistant-mcp",
    "tapo": "d:/Dev/repos/tapo-mcp",
    "netatmo": "d:/Dev/repos/netatmo-weather-mcp",
    "ring": "d:/Dev/repos/ring-mcp",
    "notion": "d:/Dev/repos/notion-mcp",
    # Creative Hub
    "blender": "d:/Dev/repos/blender-mcp",
    "gimp": "d:/Dev/repos/gimp-mcp",
    "obs": "d:/Dev/repos/obs-mcp",
    "davinci-resolve": "d:/Dev/repos/davinci-resolve-mcp",
    "reaper": "d:/Dev/repos/reaper-mcp",
    "resolume": "d:/Dev/repos/resolume-mcp",
    "vrchat": "d:/Dev/repos/vrchat-mcp",
    # Infra Hub
    "virtualization": "d:/Dev/repos/virtualization-mcp",
    "docker": "d:/Dev/repos/docker-mcp",
    "windows-operations": "d:/Dev/repos/windows-operations-mcp",
    "monitoring": "d:/Dev/repos/monitoring-mcp",
    "tailscale": "d:/Dev/repos/tailscale-mcp",
    # Knowledge Hub
    "advanced-memory": "d:/Dev/repos/advanced-memory-mcp",
    "fastsearch": "d:/Dev/repos/fastsearch-mcp",
    "immich": "d:/Dev/repos/immich-mcp",
    "readly": "d:/Dev/repos/readly-mcp",
    # Comms & Dev
    "email": "d:/Dev/repos/email-mcp",
    "alexa": "d:/Dev/repos/alexa-mcp",
    "rustdesk": "d:/Dev/repos/rustdesk-mcp",
    "bookmarks": "d:/Dev/repos/bookmarks-mcp",
    "git-github": "d:/Dev/repos/git-github-mcp",
    "pywinauto": "d:/Dev/repos/pywinauto-mcp",
    # Robotics & Hands
    "unitree": "d:/Dev/repos/unitree-robotics",
    "yahboom": "d:/Dev/repos/yahboom-mcp",
    "dreame": "d:/Dev/repos/dreame-mcp",
    "hands": "d:/Dev/repos/hands-mcp",
    "robotics": "d:/Dev/repos/robotics-mcp",
}


@app.post("/api/connector/launch/{name}")
async def launch_connector(name: str):
    """Launch an MCP sub-server via its start.ps1 script."""
    repo_path = REPO_MAP.get(name)
    if not repo_path:
        raise HTTPException(status_code=404, detail=f"No repository mapping for connector: {name}")

    start_ps1 = Path(repo_path) / "start.ps1"
    if not start_ps1.exists():
        # Try .bat as fallback
        start_bat = Path(repo_path) / "start.bat"
        if start_bat.exists():
            subprocess.Popen(
                [str(start_bat)],
                cwd=repo_path,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
            )
            return {"success": True, "message": f"Launched {name} via {start_bat}"}

        raise HTTPException(status_code=404, detail=f"Launch script not found in {repo_path}")

    try:
        subprocess.Popen(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", str(start_ps1)],
            cwd=repo_path,
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        logger.info(f"SOTA Trigger: Launched {name} from {repo_path}")
        orchestrator.storage.log_event(
            "info",
            "fleet",
            "connector_launched",
            {"name": name, "path": str(repo_path), "method": "start.ps1"},
        )
        return {"success": True, "message": f"Launched {name} via {start_ps1}"}
    except Exception as e:
        logger.error(f"Failed to launch connector {name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/connectors/{connector_id}/tools")
async def get_connector_tools(connector_id: str):
    """Proxy to connector MCP backend /tools (or equivalent). Returns tool list or 404."""
    base = _backend_url_for_connector(connector_id)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{base}/tools")
            if r.status_code >= 400:
                raise HTTPException(
                    status_code=r.status_code, detail="Tools endpoint not available"
                )
            return r.json()
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

        # 2. Try POST /tool (Blender-style) with a status tool
        try:
            tools_r = await client.get(f"{base.rstrip('/')}/tools")
            if tools_r.status_code != 200:
                return {"success": False, "server_status": None}

            tools_data = tools_r.json()
            tools_list = tools_data if isinstance(tools_data, list) else tools_data.get("tools", [])
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


# ---------------------------------------------------------------------------
# Command webhook: inbound from email/Telegram/etc. -> run /ask, optional reply
# ---------------------------------------------------------------------------


class CommandWebhookRequest(BaseModel):
    message: str
    reply_to: Optional[str] = None  # "telegram" | "discord" | null = no reply


@app.post("/hooks/command")
async def hook_command(req: CommandWebhookRequest):
    """
    Run a natural-language command and optionally send the reply to Telegram/Discord.
    Wire email-to-webhook or a Telegram bot to POST here: body.message = user text,
    body.reply_to = "telegram" or "discord" to send the reply back.
    """
    try:
        result = await orchestrator.ask(
            req.message,
            use_council=False,
            use_rag=True,
            subject="guest",
            persona="sovereign",
        )
        reply_text = (
            result.get("response", "")
            if result.get("success")
            else result.get("error", "Command failed.")
        )
        if req.reply_to and reply_text:
            await messaging_reply_to(req.reply_to, reply_text)
        return {"success": result.get("success", False), "message": reply_text}
    except Exception as e:
        logger.exception("Command webhook failed")
        return {"success": False, "message": str(e)}


# ---------------------------------------------------------------------------
# Onboarding / Comms settings (stored in orchestrator.storage secrets)
# ---------------------------------------------------------------------------


class CommsSettingsResponse(BaseModel):
    telegram_configured: bool
    discord_configured: bool


class CommsSettingsRequest(BaseModel):
    telegram_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_webhook: Optional[str] = None


@app.get("/api/settings/comms", response_model=CommsSettingsResponse)
async def get_comms_settings():
    """Return whether comms are configured (masked). Used by onboarding/settings UI."""
    storage = orchestrator.storage
    return CommsSettingsResponse(
        telegram_configured=bool(
            storage.get_secret("comms_telegram_token")
            and storage.get_secret("comms_telegram_chat_id")
        )
        or (os.getenv("ROBOFANG_TELEGRAM_TOKEN") and os.getenv("ROBOFANG_TELEGRAM_CHAT_ID")),
        discord_configured=bool(
            storage.get_secret("comms_discord_webhook") or os.getenv("ROBOFANG_DISCORD_WEBHOOK")
        ),
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

    orchestrator.storage.log_event("info", "settings", "comms_updated")
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


class AskResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class JournalPostRequest(BaseModel):
    content: str
    tags: Optional[str] = None


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
    for name, cfg in conn_cfg.items():
        backend_url = cfg.get("mcp_backend") or MCP_BACKENDS.get(name) or ""
        frontend_url = cfg.get("mcp_frontend") or ""
        if name in live:
            live[name]["enabled"] = cfg.get("enabled", False)
            live[name]["backend_url"] = backend_url
            live[name]["frontend_url"] = frontend_url
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
            "repo_path": REPO_MAP.get(name) or "",
        }
    # Backfill backend_url, repo_path, frontend_url for live connectors not in conn_cfg
    for name in list(live.keys()):
        if live[name].get("backend_url") in (None, ""):
            live[name]["backend_url"] = MCP_BACKENDS.get(name) or ""
        if live[name].get("frontend_url") is None:
            live[name]["frontend_url"] = conn_cfg.get(name, {}).get("mcp_frontend") or ""
        if live[name].get("repo_path") is None or live[name].get("repo_path") == "":
            live[name]["repo_path"] = REPO_MAP.get(name) or ""

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
        )
        if result.get("success"):
            return AskResponse(
                success=True,
                message=result.get("response", ""),
                data={"model": result.get("model")},
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
            return data.get("hands", {})
    except (OSError, json.JSONDecodeError):
        pass
    return {}


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


# Curated MCP servers installable from GitHub (id, name, category, description, repo_url).
# Merged with fleet_manifest for GET /api/fleet/catalog. Install = clone repo + run install script.
# TODO: replace with autodetect from GitHub org/user (e.g. sandraschi) via API; filter by topic *-mcp or name pattern.
FLEET_CATALOG_GITHUB: List[Dict[str, Any]] = [
    {
        "id": "blender-mcp",
        "name": "Blender",
        "category": "Creative",
        "description": "3D creation and scene control.",
        "repo_url": "https://github.com/sandraschi/blender-mcp",
    },
    {
        "id": "gimp-mcp",
        "name": "GIMP",
        "category": "Creative",
        "description": "Image editing and assets.",
        "repo_url": "https://github.com/sandraschi/gimp-mcp",
    },
    {
        "id": "svg-mcp",
        "name": "SVG",
        "category": "Creative",
        "description": "Vector graphics.",
        "repo_url": "https://github.com/sandraschi/svg-mcp",
    },
    {
        "id": "vrchat-mcp",
        "name": "VRChat",
        "category": "Creative",
        "description": "VRChat world and avatar control.",
        "repo_url": "https://github.com/sandraschi/vrchat-mcp",
    },
    {
        "id": "avatar-mcp",
        "name": "Avatar / Resonite",
        "category": "Creative",
        "description": "Resonite and avatar OSC.",
        "repo_url": "https://github.com/sandraschi/avatar-mcp",
    },
    {
        "id": "plex-mcp",
        "name": "Plex",
        "category": "Media",
        "description": "Media library and playback.",
        "repo_url": "https://github.com/sandraschi/plex-mcp",
    },
    {
        "id": "caliber-mcp",
        "name": "Calibre",
        "category": "Media",
        "description": "Ebook library.",
        "repo_url": "https://github.com/sandraschi/calibre-mcp",
    },
    {
        "id": "robotics-mcp",
        "name": "Robotics",
        "category": "Robotics",
        "description": "ROS 2, Yahboom, Unitree, Dreame.",
        "repo_url": "https://github.com/sandraschi/robotics-mcp",
    },
    {
        "id": "noetix-bumi-mcp",
        "name": "Noetix Bumi",
        "category": "Robotics",
        "description": "Humanoid ROS 2.",
        "repo_url": "https://github.com/sandraschi/noetix-bumi-mcp",
    },
    {
        "id": "virtualization-mcp",
        "name": "Virtualization",
        "category": "Infrastructure",
        "description": "VirtualBox / VM management.",
        "repo_url": "https://github.com/sandraschi/virtualization-mcp",
    },
    {
        "id": "advanced-memory-mcp",
        "name": "Advanced Memory",
        "category": "Knowledge",
        "description": "RAG and knowledge graph.",
        "repo_url": "https://github.com/sandraschi/advanced-memory-mcp",
    },
    {
        "id": "rustdesk-mcp",
        "name": "RustDesk",
        "category": "Infrastructure",
        "description": "Remote desktop.",
        "repo_url": "https://github.com/sandraschi/rustdesk-mcp",
    },
    {
        "id": "osc-mcp",
        "name": "OSC",
        "category": "Creative",
        "description": "Open Sound Control.",
        "repo_url": "https://github.com/sandraschi/osc-mcp",
    },
    {
        "id": "ring-mcp",
        "name": "Ring",
        "category": "Home",
        "description": "Ring doorbell and cameras.",
        "repo_url": "https://github.com/sandraschi/ring-mcp",
    },
    {
        "id": "tapo-camera-mcp",
        "name": "Tapo Camera",
        "category": "Home",
        "description": "TP-Link Tapo devices.",
        "repo_url": "https://github.com/sandraschi/tapo-camera-mcp",
    },
    {
        "id": "daw-mcp",
        "name": "DAW",
        "category": "Creative",
        "description": "Digital audio workstations.",
        "repo_url": "https://github.com/sandraschi/daw-mcp",
    },
]


def _fleet_catalog() -> List[Dict[str, Any]]:
    """Manifest hands (with repo_url) plus curated GitHub list; dedupe by id. Enrich from robofang.json/llm.txt when installed."""
    seen: set = set()
    out: List[Dict[str, Any]] = []
    base = _hands_base_dir()
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
    analysis = _load_fleet_analysis()
    for c in FLEET_CATALOG_GITHUB:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        entry = {**c, "description": (c.get("description") or "")[:200], "installed": False}
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


@app.get("/api/fleet/catalog")
async def fleet_catalog():
    """Catalog of MCP servers installable from GitHub (manifest + curated). Each has repo_url; install = clone from GitHub."""
    return {"success": True, "hands": _fleet_catalog()}


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


@app.post("/api/fleet/onboard")
async def fleet_onboard(req: OnboardRequest):
    """Install selected hands already in fleet manifest (clone + optional install script)."""
    if not req.hand_ids:
        return {"success": True, "results": [], "message": "No hands selected."}
    results = []
    for hand_id in req.hand_ids:
        result = await orchestrator.onboard_hand(hand_id.strip())
        results.append(
            {
                "hand_id": hand_id,
                "success": result.get("success", False),
                "message": result.get("message") or result.get("error"),
            }
        )
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
    port = int(os.getenv("PORT", 10871))
    uvicorn.run("robofang.main:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
