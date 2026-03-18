"""
robofang-mcp webapp backend — proxies to RoboFang bridge; serves frontend.
Port 10761 (fleet webapp standard). CORS for frontend on 10760.
"""

from __future__ import annotations

import os
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title="RoboFang MCP Webapp", version="0.1.0")

BRIDGE_URL = (os.getenv("ROBOFANG_BRIDGE_URL") or "http://localhost:10871").rstrip("/")
FRONTEND_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:10760")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:10760"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskBody(BaseModel):
    message: str
    use_council: bool = False
    use_rag: bool = True


@app.get("/api/health")
async def health():
    """Backend and bridge reachability."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{BRIDGE_URL}/health")
            data = r.json() if r.status_code == 200 else {}
            return {
                "backend": "ok",
                "bridge_url": BRIDGE_URL,
                "bridge_ok": r.status_code == 200,
                "bridge": data,
            }
    except Exception as e:
        return {
            "backend": "ok",
            "bridge_url": BRIDGE_URL,
            "bridge_ok": False,
            "bridge_error": str(e),
        }


@app.get("/api/status")
async def status():
    """Bridge status (proxy)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{BRIDGE_URL}/health")
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Bridge error: {e}") from e


@app.get("/api/deliberations")
async def deliberations(limit: int = 30):
    """Recent deliberations (proxy)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{BRIDGE_URL}/deliberations", params={"limit": min(limit, 100)})
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@app.post("/api/ask")
async def ask(body: AskBody):
    """Send message to orchestrator (proxy)."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{BRIDGE_URL}/ask",
                json={
                    "message": body.message,
                    "use_council": body.use_council,
                    "use_rag": body.use_rag,
                },
            )
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


# Serve frontend static (when built)
_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@app.get("/")
async def serve_index():
    if (_dist / "index.html").exists():
        return FileResponse(_dist / "index.html")
    return {"message": "robofang-mcp webapp backend; build frontend and put in frontend/dist"}


@app.get("/{path:path}")
async def serve_static(path: str):
    if (_dist / path).is_file():
        return FileResponse(_dist / path)
    if (_dist / "index.html").exists():
        return FileResponse(_dist / "index.html")
    raise HTTPException(status_code=404, detail="Not found")
