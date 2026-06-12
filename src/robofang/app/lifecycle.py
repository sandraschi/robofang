"""RoboFang Lifecycle: FastAPI application instantiation and event management."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from robofang import __version__ as _pkg_version
from robofang.app.api import api_router
from robofang.app.logging import setup_logging
from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App State & Status
# ---------------------------------------------------------------------------


class AppStatus:
    START_TIME = None
    HEALTHY = True
    LAST_HEARTBEAT = None


# ---------------------------------------------------------------------------
# Lifecycle Events (Lifespan)
# ---------------------------------------------------------------------------


async def _start_orchestrator_background():
    """Start orchestrator without blocking HTTP readiness."""
    from robofang import messaging as _messaging
    from robofang.app.inbox import process_inbox_message

    orchestrator._email_sender = _messaging._bridge.send_email
    orchestrator._inbox_processor = process_inbox_message
    try:
        await orchestrator.start()
        logger.info("Orchestrator started (background).")
    except Exception as e:
        logger.error("Orchestrator start failed: %s", e)
        AppStatus.HEALTHY = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup and shutdown logic."""
    from datetime import datetime

    AppStatus.START_TIME = datetime.now()
    from robofang import __version__

    logger.info("RoboFang starting up (v%s)", orchestrator.config.get("version", __version__))

    try:
        from robofang.app.fleet import update_backends_from_topology

        update_backends_from_topology()
        logger.info("Fleet MCP backend map synced from orchestrator topology.")
    except Exception as e:
        logger.error("Startup failure: %s", e)
        AppStatus.HEALTHY = False

    # Defer heavy orchestrator start so HTTP (health, hub) is responsive immediately.
    async def _deferred_start():
        await asyncio.sleep(0.5)
        await _start_orchestrator_background()

    orch_task = asyncio.create_task(_deferred_start())

    # Enter the mounted MCP gateway's own lifespan (session manager), if present.
    mcp_lifespan = getattr(app.state, "mcp_lifespan", None)
    if mcp_lifespan is not None:
        async with mcp_lifespan(app):
            yield
    else:
        yield

    logger.info("RoboFang shutting down...")
    orch_task.cancel()
    try:
        await orch_task
    except asyncio.CancelledError:
        pass
    try:
        await orchestrator.stop()
    except Exception as e:
        logger.warning("Orchestrator stop failed: %s", e)
    try:
        from robofang.app.fleet import stop_all_connectors

        stop_all_connectors()
    except Exception as e:
        logger.warning("Shutdown cleanup failed: %s", e)


# ---------------------------------------------------------------------------
# App Factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    # Ensure logging is setup first
    setup_logging()

    app = FastAPI(
        title="RoboFang Core",
        description="Autonomous Fleet Orchestrator & Robotic Hand Controller",
        version=orchestrator.config.get("version", _pkg_version),
        lifespan=lifespan,
    )

    # Initialize Prometheus Metrics
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app)

    # CORS — pin to known hub/dev origins. Wildcard "*" with allow_credentials=True
    # is rejected by the Fetch spec, so credentialed browser calls would silently fail.
    import os as _os

    _default_origins = [
        "http://localhost:10864",
        "http://127.0.0.1:10864",
        "http://localhost:10870",
        "http://127.0.0.1:10870",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    _extra = _os.getenv("ROBOFANG_CORS_ORIGINS", "")
    _origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── MCP gateway (Unified Gateway) ────────────────────────────────────────
    # Mount the in-process FastMCP server so MCP clients (Cursor, Claude Desktop)
    # can reach the same tools the bridge exposes over REST. Tools call the
    # orchestrator directly. Endpoint: /mcp (streamable HTTP).
    try:
        from fastmcp import FastMCP

        from robofang.mcp_server import register_mcp

        _mcp = FastMCP("RoboFang")
        register_mcp(_mcp, orchestrator)
        _mcp_app = _mcp.http_app(path="/")
        # Chain the gateway's session-manager lifespan into ours (see lifespan()).
        app.state.mcp_lifespan = _mcp_app.lifespan
        app.mount("/mcp", _mcp_app)
        logger.info("MCP gateway mounted at /mcp (streamable HTTP).")
    except Exception as e:
        logger.error("MCP gateway mount failed: %s", e)

    # Root route for SPA redirect or API index
    @app.get("/")
    async def index():
        return JSONResponse(
            {
                "name": "RoboFang Core",
                "status": "online" if AppStatus.HEALTHY else "degraded",
                "api_root": "/api",
                "docs": "/docs",
            }
        )

    from robofang.app.api.comms import ask_router
    from robofang.diagnostics import router as diagnostics_router
    from robofang.webhooks import router as webhooks_router

    app.include_router(api_router)
    app.include_router(ask_router)
    app.include_router(diagnostics_router)
    app.include_router(webhooks_router)

    return app


# Main app instance for Uvicorn
app = create_app()
