import collections
import logging
import uvicorn
import httpx
import os
import subprocess
import time
from pathlib import Path
import psutil
import asyncio
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from fastmcp import FastMCP

from robofang.core.orchestrator import OrchestrationClient
from robofang.plugins.collector_hand import CollectorHand
from robofang.plugins.robotics_hand import RoboticsHand
from robofang.mcp_server import get_help_content, register_mcp
from robofang.webhooks import router as webhooks_router
from robofang.diagnostics import router as diagnostics_router
from robofang.messaging import reply_to as messaging_reply_to
from robofang.core.hand_manifest import HandDefinition, HandAgentConfig

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

    LEVEL_MAP = {
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
                    "timestamp": time.strftime(
                        "%Y-%m-%d %H:%M:%S", time.localtime(record.created)
                    ),
                    "level": self.LEVEL_MAP.get(record.levelno, "info"),
                    "source": record.name.replace("robofang.", "").replace(
                        "ROBOFANG_", ""
                    )
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
    """Manage orchestrator lifecycle and auto-launch enabled fleet nodes.
    Launch MCP server processes first, then wait, then start orchestrator so
    connector.connect() can reach backends that are already binding.
    """
    logger.info("RoboFang Bridge starting up...")
    await auto_launch_enabled_connectors()
    await asyncio.sleep(8)
    await orchestrator.start()


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
                    logger.error(
                        f"Fleet Automation: Auto-launch failed for '{name}': {e}"
                    )
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
}


@app.post("/api/connector/launch/{name}")
async def launch_connector(name: str):
    """Launch an MCP sub-server via its start.ps1 script."""
    repo_path = REPO_MAP.get(name)
    if not repo_path:
        raise HTTPException(
            status_code=404, detail=f"No repository mapping for connector: {name}"
        )

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

        raise HTTPException(
            status_code=404, detail=f"Launch script not found in {repo_path}"
        )

    try:
        # Launch via PowerShell in a new console to prevent zombie-blocking the bridge
        subprocess.Popen(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", str(start_ps1)],
            cwd=repo_path,
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        logger.info(f"SOTA Trigger: Launched {name} from {repo_path}")
        return {"success": True, "message": f"Launched {name} via {start_ps1}"}
    except Exception as e:
        logger.error(f"Failed to launch connector {name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Enable CORS for dashboard on port 10864
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:10864",
        "http://localhost:10870",
        "http://127.0.0.1:10870",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
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


@app.post("/api/fleet/launch")
async def launch_app(request: LaunchRequest):
    """Launch another MCP app via its start.ps1 script."""
    path = Path(request.repo_path)
    if not path.exists():
        raise HTTPException(
            status_code=404, detail=f"Path {request.repo_path} does not exist"
        )

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
        name: getattr(conn, "active", False)
        for name, conn in orchestrator.connectors.items()
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
        }

    # 2. Federation map: connectors section
    topology = orchestrator.topology
    conn_cfg: dict = topology.get("connectors", {})
    for name, cfg in conn_cfg.items():
        if name in live:
            live[name]["enabled"] = cfg.get("enabled", False)
            continue
        live[name] = {
            "id": name,
            "name": name.replace("-", " ").title(),
            "type": "connector",
            "status": "offline",
            "enabled": cfg.get("enabled", False),
            "source": "config",
            "domain": "connectors",
        }

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
# Home Hub proxy routes  — /home/{connector}/{path}
# Thin reverse proxy: dashboard -> bridge (one CORS-safe origin) -> MCP backend
# ---------------------------------------------------------------------------


async def _proxy(connector: str, path: str, request: Request) -> Response:
    """Generic reverse proxy to an MCP backend."""
    base = MCP_BACKENDS.get(connector)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector}")

    url = f"{base}/{path}" if path else base
    method = request.method
    body = await request.body()
    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length")
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


@app.api_route(
    "/home/{connector}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"]
)
async def home_connector_path(connector: str, path: str, request: Request):
    """Proxy to MCP backend sub-path."""
    return await _proxy(connector, path, request)


@app.get("/home")
async def home_status():
    """Return live reachability for all connectors in MCP_BACKENDS."""
    results = {}

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

    # Parallelize pings to avoid sequential delay-stacking
    tasks = [check_one(name, base_url) for name, base_url in MCP_BACKENDS.items()]
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
        return {"success": result.get("success", False), "data": result}
    except Exception as e:
        logger.error(f"Failed to post journal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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


def main():
    """Entry point for the robofang-bridge script."""
    port = int(os.getenv("PORT", 10871))
    uvicorn.run("robofang.main:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
