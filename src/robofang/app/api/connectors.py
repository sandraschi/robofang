"""RoboFang Connectors API Router: Lifecycle, Status, and Topology."""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from robofang.app.fleet import (
    get_active_connectors_with_ports,
    launch_connector,
    stop_connector,
)
from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/connectors", tags=["Connectors"])

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class StopConnectorsRequest(BaseModel):
    connector_ids: List[str]


class ConnectorActionRequest(BaseModel):
    connector_id: str
    action: str  # "start" | "stop" | "restart"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/active")
async def connectors_active():
    """Return all currently active/running connectors with their assigned ports."""
    try:
        active = get_active_connectors_with_ports()
        return {"success": True, "active": active}
    except Exception as e:
        logger.exception("Connectors active failed")
        return {"success": False, "error": str(e)}


@router.post("/stop")
async def connectors_stop_batch(req: StopConnectorsRequest):
    """Batch stop connectors."""
    results = {}
    for cid in req.connector_ids:
        success = stop_connector(cid)
        results[cid] = success
    return {"success": True, "results": results}


@router.post("/{connector_id}/start")
async def connector_start(connector_id: str):
    """Start a specific connector."""
    try:
        success = await launch_connector(connector_id)
        return {"success": success, "connector_id": connector_id}
    except Exception as e:
        logger.error("Failed to start %s: %s", connector_id, e)
        return {"success": False, "error": str(e)}


@router.post("/{connector_id}/stop")
async def connector_stop(connector_id: str):
    """Stop a specific connector."""
    success = stop_connector(connector_id)
    return {"success": success, "connector_id": connector_id}


@router.get("/{connector_id}/logs")
async def connector_logs(connector_id: str, limit: int = 100):
    """Retrieve logs for a specific connector if buffered."""
    # Note: Connector logs are often handled by individual sub-processes.
    # If the orchestrator captures these, we return them here.
    # Currently, we look at the Fleet analysis or process buffers.
    return {"success": True, "logs": [], "message": "Log streaming coming soon."}


@router.get("/topology")
async def connectors_topology():
    """Get the current connector topology (which are enabled/configured)."""
    topo = orchestrator.get_topology()
    return {"success": True, "topology": topo.get("connectors", {})}


@router.post("/topology")
async def connectors_update_topology(topo_update: Dict[str, Any]):
    """Update connector topology settings."""
    try:
        orchestrator.update_topology({"connectors": topo_update})
        return {"success": True, "message": "Topology updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def connectors_config():
    """Retrieve global connector configuration."""
    return {"success": True, "config": orchestrator.config.get("connectors", {})}


@router.post("/{connector_id}/test")
async def connector_test(connector_id: str):
    """Test connection to a specific connector endpoint."""
    connector = orchestrator.connectors.get(connector_id)
    if not connector:
        return {
            "success": False,
            "status": "offline",
            "message": f"Connector {connector_id} not initialized in orchestrator.",
        }

    online = await connector.ping()
    return {
        "success": online,
        "status": "online" if online else "offline",
        "message": f"Test ping to {connector_id} {'successful' if online else 'failed'}.",
    }
