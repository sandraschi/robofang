"""RoboFang Lifecycle: FastAPI application instantiation and event management."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    logger.info("RoboFang starting up (System v%s)", orchestrator.config.get("version", "12.3.0"))

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
        version=orchestrator.config.get("version", "12.3.0"),
        lifespan=lifespan,
    )

    # Initialize Prometheus Metrics
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
