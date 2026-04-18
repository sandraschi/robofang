"""
RoboFang Diagnostics Substrate
Exposes fleet health, adversarial pulse integrity, and autonomous discoveries.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter
from pydantic import BaseModel

from robofang.supervisor import supervisor

logger = logging.getLogger("ROBOFANG_diagnostics")

router = APIRouter(prefix="/api/diagnostics", tags=["diagnostics"])


class HeartbeatResponse(BaseModel):
    status: str
    integrity: str
    council_active: bool
    fleet_node_count: int
    system_pressure: dict[str, float]
    heartbeat_latency_ms: float
    timestamp: str


class Discovery(BaseModel):
    id: str
    type: str
    description: str
    timestamp: float


class HealthReport(BaseModel):
    success: bool
    cohesion_score: int
    risk_level: str
    anomalies: list[str]
    discoveries: list[Discovery]


def _system_pressure() -> dict[str, float]:
    """Real CPU and memory usage via psutil."""
    try:
        import psutil

        return {
            "cpu_percent": float(psutil.cpu_percent(interval=0.1)),
            "memory_percent": float(psutil.virtual_memory().percent),
        }
    except Exception:
        return {"cpu_percent": 0.0, "memory_percent": 0.0}


@router.get("/heartbeat", response_model=HeartbeatResponse)
async def get_heartbeat():
    """Get the current sovereign substrate heartbeat."""
    t0 = time.perf_counter()
    pulse = supervisor.get_pulse()
    latency_ms = (time.perf_counter() - t0) * 1000.0
    nodes = supervisor.fleet_nodes
    fleet_count = len(nodes) if isinstance(nodes, list) else (len(nodes) if isinstance(nodes, dict) else 0)
    council_active = pulse.get("council_active", False)
    return {
        "status": "nominal" if pulse.get("integrity") == "nominal" else "caution",
        "integrity": pulse.get("integrity", "unknown"),
        "council_active": council_active,
        "fleet_node_count": fleet_count,
        "system_pressure": _system_pressure(),
        "heartbeat_latency_ms": round(latency_ms, 2),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@router.get("/fleet/health", response_model=HealthReport)
async def get_fleet_health():
    """Get detailed fleet health and cohesion report."""
    report = supervisor.get_fleet_health()
    discoveries = supervisor.get_discoveries()

    formatted_discoveries = [
        Discovery(
            id=str(i),
            type=d.get("type", "skill"),
            description=d.get("description", "Unknown discovery"),
            timestamp=d.get("timestamp", time.time()),
        )
        for i, d in enumerate(discoveries)
    ]

    return {
        "success": True,
        "cohesion_score": report["cohesion_score"],
        "risk_level": report["risk_level"],
        "anomalies": report["anomalies"],
        "discoveries": formatted_discoveries,
    }


@router.post("/forensics")
async def run_forensics():
    """Trigger an adversarial forensic sweep using real pulse and fleet health."""
    logger.info("Initiating agentic forensic sweep...")
    pulse = supervisor.get_pulse()
    report = supervisor.get_fleet_health()
    discoveries = supervisor.get_discoveries()
    anomalies = report.get("anomalies", [])
    cohesion = report.get("cohesion_score", 0)
    risk = report.get("risk_level", "unknown")
    council = pulse.get("council_active", False)
    integrity = pulse.get("integrity", "unknown")
    if anomalies:
        message = (
            f"FORENSIC_UPDATE: Sweep complete. Integrity={integrity}, "
            f"council_active={council}, cohesion={cohesion}, risk={risk}. "
            f"Anomalies: {anomalies}. Discoveries: {len(discoveries)}."
        )
    else:
        message = (
            f"FORENSIC_UPDATE: Sweep complete. All nodes verified. "
            f"Integrity={integrity}, council_active={council}, "
            f"cohesion={cohesion}, risk={risk}. No adversarial injections detected."
        )
    return {"success": True, "message": message}
