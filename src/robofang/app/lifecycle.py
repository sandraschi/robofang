"""RoboFang Lifecycle: FastAPI application instantiation and event management."""

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup and shutdown logic."""
    # 1. Startup
    from datetime import datetime

    AppStatus.START_TIME = datetime.now()
    logger.info("RoboFang starting up (System v%s)", orchestrator.config.get("version", "12.3.0"))

    # Initialize components if needed
    try:
        from robofang.app.fleet import update_backends_from_topology

        update_backends_from_topology()
        logger.info("Fleet MCP backend map synced from orchestrator topology.")
    except Exception as e:
        logger.error("Startup failure: %s", e)
        AppStatus.HEALTHY = False

    yield

    # 2. Shutdown
    logger.info("RoboFang shutting down...")
    # Clean up connectors, stop background tasks
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

    # Include API Routers
    app.include_router(api_router)

    return app


# Main app instance for Uvicorn
app = create_app()
