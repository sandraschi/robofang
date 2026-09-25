"""RoboFang System API Router: Health, Status, and Metrics."""

import logging
import os
from datetime import datetime

import psutil
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from robofang.app.logging import log_buffer
from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/system", tags=["System"])

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class SystemStatusResponse(BaseModel):
    online: bool
    version: str
    uptime: float
    cpu_percent: float
    memory_percent: float
    hands_count: int
    connectors_count: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/health")
async def system_health():
    """Simple Liveness/Readiness check."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@router.get("/status", response_model=SystemStatusResponse)
async def system_status():
    """Detailed system status including resource usage and fleet counts."""
    # Note: Uptime tracking to be implemented in lifecycle.py
    # For now, using a placeholder or calculating from process start
    process = psutil.Process(os.getpid())
    uptime = datetime.now().timestamp() - process.create_time()

    return {
        "online": True,
        "version": orchestrator.config.get("version", "12.3.0"),
        "uptime": uptime,
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "hands_count": len(orchestrator.hands.hands),
        "connectors_count": len([c for c in orchestrator.connectors.values() if getattr(c, "active", False)]),
    }


@router.get("/logs")
async def system_logs(limit: int = 100):
    """Retrieve recent buffered system logs."""
    logs = list(log_buffer) if log_buffer else []
    return {"success": True, "logs": logs[-limit:]}


@router.get("/audit")
async def system_audit():
    """Trigger a system integrity audit (Heartbeat)."""
    try:
        from robofang.core.heartbeat import HeartbeatService

        report = await HeartbeatService().perform_audit()
        return {"success": True, "report": report}
    except Exception as e:
        logger.exception("Audit failed")
        return {"success": False, "error": str(e)}


@router.get("/config")
async def system_config():
    """Retrieve global system configuration (read-only)."""
    return {"success": True, "config": orchestrator.config}


@router.post("/config/reload")
async def system_config_reload():
    """Reload the fleet topology (federation_map.json) from disk.

    Runtime config is passed in at construction and has no on-disk source to reload.
    """
    try:
        orchestrator._load_topology()
        return {"success": True, "message": f"Topology reloaded from {orchestrator.fleet_config_path.name}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
