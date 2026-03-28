"""RoboFang API Router Aggregator: Exporting all sub-package routers for easy integration."""

from fastapi import APIRouter

from .connectors import router as connectors_router
from .docs import router as docs_router
from .fleet import router as fleet_router
from .hands import router as hands_router
from .system import router as system_router

# Root router for the /api/ prefix
api_router = APIRouter()

# Include all sub-routers
api_router.include_router(fleet_router)
api_router.include_router(connectors_router)
api_router.include_router(hands_router)
api_router.include_router(system_router)
api_router.include_router(docs_router)

__all__ = ["api_router"]
