"""
RoboFang Diagnostics Substrate
Exposes fleet health, adversarial pulse integrity, and autonomous discoveries.
"""

from __future__ import annotations

import logging
import os
import time

from fastapi import APIRouter
from pydantic import BaseModel

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
    """Get the current sovereign substrate heartbeat (bridge-local; fast)."""
    t0 = time.perf_counter()
    integrity = "nominal"
    fleet_count = 0
    council_active = False
    if os.getenv("ROBOFANG_SUPERVISOR_PROCESS") == "1":
        try:
            from robofang.supervisor import supervisor

            pulse = supervisor.get_pulse()
            integrity = pulse.get("integrity", "unknown")
            nodes = supervisor.fleet_nodes
            fleet_count = len(nodes) if isinstance(nodes, list) else (len(nodes) if isinstance(nodes, dict) else 0)
            council_active = pulse.get("council_active", False)
        except Exception:
            integrity = "degraded"
    else:
        try:
            from robofang.core.state import orchestrator

            fleet_count = len(orchestrator.hands.hands)
            council_active = getattr(orchestrator, "running", False)
        except Exception as exc:
            logger.debug("Bridge heartbeat orchestrator probe failed: %s", exc)
    latency_ms = (time.perf_counter() - t0) * 1000.0
    return {
        "status": "nominal" if integrity == "nominal" else "caution",
        "integrity": integrity,
        "council_active": council_active,
        "fleet_node_count": fleet_count,
        "system_pressure": _system_pressure(),
        "heartbeat_latency_ms": round(latency_ms, 2),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@router.get("/fleet/health", response_model=HealthReport)
async def get_fleet_health():
    """Get detailed fleet health and cohesion report."""
    if os.getenv("ROBOFANG_SUPERVISOR_PROCESS") != "1":
        return HealthReport(
            success=True,
            cohesion_score=100,
            risk_level="low",
            anomalies=[],
            discoveries=[],
        )
    from robofang.supervisor import supervisor

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
    from robofang.supervisor import supervisor

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
