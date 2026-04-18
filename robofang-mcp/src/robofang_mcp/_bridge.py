"""Thin HTTP client to the RoboFang bridge. All tools call these."""

from __future__ import annotations

import os
from typing import Any

import httpx

DEFAULT_BRIDGE_URL = "http://localhost:10871"


def get_bridge_url() -> str:
    return (os.getenv("ROBOFANG_BRIDGE_URL") or DEFAULT_BRIDGE_URL).rstrip("/")


async def bridge_get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{get_bridge_url()}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()


async def bridge_post(path: str, json: dict[str, Any]) -> dict[str, Any]:
    url = f"{get_bridge_url()}{path}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, json=json)
        r.raise_for_status()
        return r.json()


async def bridge_patch(path: str, json: dict[str, Any]) -> dict[str, Any]:
    url = f"{get_bridge_url()}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.patch(url, json=json)
        r.raise_for_status()
        return r.json()


async def fetch_status() -> dict[str, Any]:
    """GET /health; derive connector counts from health.connectors."""
    try:
        health = await bridge_get("/health")
        connectors = health.get("connectors") or {}
        if not isinstance(connectors, dict):
            connectors = {}
        online = sum(1 for v in connectors.values() if v)
        return {
            "success": True,
            "service": health.get("service", "RoboFang-bridge"),
            "version": health.get("version", "?"),
            "connectors_online": online,
            "connectors_total": len(connectors),
            "connectors": connectors,
            "running": health.get("status") == "healthy",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_help() -> dict[str, Any]:
    """GET /api/help."""
    try:
        return await bridge_get("/api/help")
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_ask(
    message: str,
    use_council: bool = False,
    use_rag: bool = True,
    subject: str = "guest",
    persona: str = "sovereign",
) -> dict[str, Any]:
    """POST /ask."""
    try:
        return await bridge_post(
            "/ask",
            {
                "message": message,
                "use_council": use_council,
                "use_rag": use_rag,
                "subject": subject,
                "persona": persona,
            },
        )
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_fleet() -> dict[str, Any]:
    """GET /fleet."""
    try:
        data = await bridge_get("/fleet")
        return {"success": True, **data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_deliberations(limit: int = 50, since_id: int | None = None) -> dict[str, Any]:
    """GET /deliberations."""
    try:
        params: dict[str, Any] = {"limit": min(max(1, limit), 100)}
        if since_id is not None:
            params["since_id"] = since_id
        return await bridge_get("/deliberations", params=params)
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_system() -> dict[str, Any]:
    """GET /system — uptime, memory, connector states."""
    try:
        return await bridge_get("/system")
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_logs(
    limit: int = 50,
    level: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    """GET /logs — bridge log ring buffer."""
    try:
        params: dict[str, Any] = {"limit": min(max(1, limit), 300)}
        if level:
            params["level"] = level
        if category:
            params["category"] = category
        return await bridge_get("/logs", params=params)
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_hands() -> dict[str, Any]:
    """GET /api/hands — autonomous hands status."""
    try:
        return await bridge_get("/api/hands")
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_routines() -> dict[str, Any]:
    """GET /api/routines — stored routines (scheduling)."""
    try:
        return await bridge_get("/api/routines")
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_personas() -> dict[str, Any]:
    """GET /personality/personas — council/personality names."""
    try:
        return await bridge_get("/personality/personas")
    except Exception as e:
        return {"success": False, "error": str(e)}


async def fetch_fleet_settings() -> dict[str, Any]:
    """GET /api/settings/fleet — fleet config (e.g. GitHub owner)."""
    try:
        return await bridge_get("/api/settings/fleet")
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Agentic tasks (routines) CRUD ──────────────────────────────────────────


async def fetch_routine(routine_id: str) -> dict[str, Any]:
    """GET /api/routines/{routine_id}."""
    try:
        return await bridge_get(f"/api/routines/{routine_id}")
    except Exception as e:
        return {"success": False, "error": str(e)}


async def create_routine_from_phrase(
    phrase: str,
    report_email: str | None = None,
    run_now: bool = False,
) -> dict[str, Any]:
    """POST /api/routines/from-phrase. run_now=True runs immediately and returns run_result (e.g. patrol report)."""
    try:
        payload: dict[str, Any] = {"phrase": phrase, "run_now": run_now}
        if report_email:
            payload["report_email"] = report_email
        return await bridge_post("/api/routines/from-phrase", payload)
    except Exception as e:
        return {"success": False, "error": str(e)}


async def run_routine(routine_id: str) -> dict[str, Any]:
    """POST /api/routines/{routine_id}/run."""
    try:
        return await bridge_post(f"/api/routines/{routine_id}/run", {})
    except Exception as e:
        return {"success": False, "error": str(e)}


async def update_routine(
    routine_id: str,
    name: str | None = None,
    time_local: str | None = None,
    recurrence: str | None = None,
    action_type: str | None = None,
    params: dict[str, Any] | None = None,
    enabled: bool | None = None,
) -> dict[str, Any]:
    """PATCH /api/routines/{routine_id}."""
    try:
        payload: dict[str, Any] = {}
        if name is not None:
            payload["name"] = name
        if time_local is not None:
            payload["time_local"] = time_local
        if recurrence is not None:
            payload["recurrence"] = recurrence
        if action_type is not None:
            payload["action_type"] = action_type
        if params is not None:
            payload["params"] = params
        if enabled is not None:
            payload["enabled"] = enabled
        return await bridge_patch(f"/api/routines/{routine_id}", payload)
    except Exception as e:
        return {"success": False, "error": str(e)}


async def delete_routine(routine_id: str) -> dict[str, Any]:
    """DELETE /api/routines/{routine_id}."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.delete(f"{get_bridge_url()}/api/routines/{routine_id}")
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {"success": False, "error": str(e)}
