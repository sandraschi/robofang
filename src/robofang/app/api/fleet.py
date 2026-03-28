"""RoboFang Fleet API Router: Discovery, Installer, and Catalog management."""

import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from robofang.app.fleet import (
    MCP_BACKENDS,
    _fleet_catalog,
    _fleet_github_owner,
    _fleet_installer_catalog,
    _hand_id_to_connector,
    _hands_base_dir,
)
from robofang.core.external_registries import (
    discover_docker,
    discover_registry,
    get_registry_server_repo,
    normalize_github_repo_url,
)
from robofang.core.installer import HandManifestItem
from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/fleet", tags=["Fleet"])

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class AddFromExternalRequest(BaseModel):
    source: str  # "registry" | "docker" | "github"
    id: Optional[str] = None  # registry/docker server id
    repo_url: Optional[str] = None  # required for github; optional override for registry
    name: Optional[str] = None


class CatalogItemForInstall(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    repo_url: str


class OnboardFromGitHubRequest(BaseModel):
    items: List[CatalogItemForInstall]


class OnboardRequest(BaseModel):
    hand_ids: List[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/discover")
async def fleet_discover(source: str = "registry", limit: int = 50):
    """Discover MCP servers from external sources: registry or docker."""
    source = (source or "registry").lower()
    if source == "registry":
        items = await discover_registry(limit=min(limit, 100))
    elif source == "docker":
        items = discover_docker()
    else:
        raise HTTPException(
            status_code=400,
            detail="source must be 'registry' or 'docker'.",
        )
    return {"success": True, "source": source, "items": items}


@router.post("/add-from-external")
async def fleet_add_from_external(req: AddFromExternalRequest):
    """Add an MCP server to the fleet from an external source."""
    source = (req.source or "").strip().lower()
    if not source:
        raise HTTPException(status_code=400, detail="source is required")

    if source == "github":
        repo_url = normalize_github_repo_url(req.repo_url or "")
        if not repo_url:
            raise HTTPException(status_code=400, detail="repo_url is required.")
        hand_id = Path(repo_url).name.replace(".git", "")
        name = (req.name or hand_id).strip() or hand_id
        item = HandManifestItem(
            id=hand_id,
            name=name,
            category="External",
            description="Added from GitHub",
            repo_url=repo_url,
            install_script="start.ps1",
            tags=["external"],
        )
    elif source == "registry":
        if not req.id:
            raise HTTPException(status_code=400, detail="id is required for registry")
        hand_id = req.id.strip()
        parts = hand_id.rsplit("-", 1)
        server_name = f"{parts[0]}/{parts[1]}" if len(parts) == 2 else hand_id
        repo_url = req.repo_url and req.repo_url.strip()
        if not repo_url:
            repo_url = await get_registry_server_repo(server_name)
        if not repo_url:
            raise HTTPException(status_code=400, detail="repo_url not found.")
        name = (req.name or hand_id).strip() or hand_id
        item = HandManifestItem(
            id=hand_id,
            name=name,
            category="External",
            description=f"From MCP Registry: {hand_id}",
            repo_url=repo_url,
            install_script="start.ps1",
            tags=["external", "registry"],
        )
    else:
        raise HTTPException(status_code=501, detail="Source not supported.")

    try:
        orchestrator.installer.add_hand_to_manifest(item)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    result = await orchestrator.onboard_hand(item.id)
    return {
        "success": True,
        "message": f"Added {item.id} to manifest and ran install.",
        "install_result": result,
    }


@router.get("/catalog")
async def fleet_catalog() -> JSONResponse:
    """Consolidated fleet catalog for the UI."""
    try:
        hands = _fleet_catalog()
        catalog = _fleet_installer_catalog()
        return JSONResponse(
            status_code=200,
            content={"success": True, "hands": hands, "catalog": catalog},
        )
    except Exception as e:
        logger.exception("Fleet catalog failed")
        return JSONResponse(
            status_code=200,
            content={"success": False, "hands": [], "catalog": [], "error": str(e)},
        )


@router.get("/installer-paths")
async def fleet_installer_paths():
    """Debug: paths where Fleet Installer operates."""
    mp = getattr(orchestrator.installer, "manifest_path", None)
    hb = getattr(orchestrator.installer, "hands_base_dir", None)
    return {
        "success": True,
        "manifest_path": str(mp) if mp else "",
        "hands_dir": str(hb) if hb else "",
        "manifest_exists": mp is not None and mp.exists(),
    }


@router.post("/onboard-from-github")
async def fleet_onboard_from_github(req: OnboardFromGitHubRequest):
    """Install selected items by repo_url (clone from GitHub)."""
    if not req.items:
        return {"success": True, "results": [], "message": "No items selected."}
    results = []
    for item in req.items:
        repo_url = (item.repo_url or "").strip()
        if not repo_url:
            results.append(
                {"hand_id": item.id or "", "success": False, "message": "Missing repo_url"}
            )
            continue
        try:
            hand_id = (item.id or Path(repo_url).name.replace(".git", "")).strip()
            name = (item.name or hand_id).strip() or hand_id
            add_item = HandManifestItem(
                id=hand_id,
                name=name,
                category=item.category or "External",
                description=item.description or "Added from GitHub",
                repo_url=repo_url,
                install_script="start.ps1",
                tags=["external"],
            )
            orchestrator.installer.add_hand_to_manifest(add_item)
            result = await orchestrator.onboard_hand(hand_id)
            results.append(
                {
                    "hand_id": hand_id,
                    "success": result.get("success", False),
                    "message": result.get("message") or result.get("error"),
                }
            )
        except Exception as e:
            results.append({"hand_id": item.id or "", "success": False, "message": str(e)})
    return {"success": True, "results": results}


def _install_preflight() -> Optional[str]:
    import shutil

    if shutil.which("gh") is None:
        return "GitHub CLI (gh) not found in PATH."
    mp = getattr(orchestrator.installer, "manifest_path", None)
    if mp is None:
        return "Installer not configured (no manifest path)."
    return None


@router.post("/onboard")
async def fleet_onboard(req: OnboardRequest):
    """Install selected hands from catalog."""
    if not req.hand_ids:
        return {"success": True, "results": [], "message": "No hands selected."}
    preflight = _install_preflight()
    if preflight:
        return {"success": False, "message": preflight}

    manifest_ids = {h.id for h in orchestrator.installer.get_manifest()}
    results = []
    from robofang.app.fleet import FLEET_CATALOG_GITHUB

    for hand_id in req.hand_ids:
        hand_id = hand_id.strip()
        if hand_id not in manifest_ids:
            catalog_entry = next((c for c in FLEET_CATALOG_GITHUB if c.get("id") == hand_id), None)
            if not catalog_entry:
                results.append(
                    {"hand_id": hand_id, "success": False, "message": "Hand not in catalog."}
                )
                continue
            owner = _fleet_github_owner()
            repo_url = f"https://github.com/{owner}/{hand_id}"
            try:
                orchestrator.installer.add_hand_to_manifest(
                    HandManifestItem(
                        id=hand_id,
                        name=catalog_entry.get("name", hand_id),
                        category=catalog_entry.get("category", "Other"),
                        description=catalog_entry.get("description", ""),
                        repo_url=repo_url,
                        install_script="start.ps1",
                        tags=["catalog"],
                    )
                )
                manifest_ids.add(hand_id)
            except Exception as e:
                results.append({"hand_id": hand_id, "success": False, "message": str(e)})
                continue

        result = await orchestrator.onboard_hand(hand_id)
        results.append(
            {
                "hand_id": hand_id,
                "success": result.get("success", False),
                "message": result.get("message") or result.get("error"),
            }
        )
        if result.get("success"):
            # Register in topology
            conn_id = _hand_id_to_connector(hand_id)
            try:
                orchestrator.update_topology(
                    {
                        "connectors": {
                            conn_id: {
                                "enabled": True,
                                "mcp_backend": MCP_BACKENDS.get(conn_id) or "",
                            }
                        }
                    }
                )
            except Exception as e:
                logger.warning("Failed to register %s in topology: %s", conn_id, e)

    return {"success": True, "results": results}


@router.get("/hand/{hand_id}/info")
async def fleet_hand_info(hand_id: str):
    """Return manifest entry plus metadata for a specific hand."""
    from robofang.app.fleet import _load_fleet_analysis, _read_repo_metadata

    hand_id = hand_id.strip()
    hands = [h for h in orchestrator.installer.get_manifest() if h.id == hand_id]
    if not hands:
        raise HTTPException(status_code=404, detail="Hand not found")
    h = hands[0]
    entry = {
        "id": h.id,
        "name": h.name,
        "category": h.category,
        "description": h.description,
        "repo_url": h.repo_url,
    }
    path = _hands_base_dir() / hand_id
    if path.exists():
        meta = _read_repo_metadata(path)
        entry.update(meta)
    a = _load_fleet_analysis().get(hand_id, {})
    entry["fastmcp_version"] = a.get("fastmcp_version")
    entry["mcpb_present"] = a.get("mcpb_present", False)
    return {"success": True, "hand": entry}


@router.get("/manifest")
async def fleet_manifest():
    """Return installable hands from manifest (yaml)."""
    hands = orchestrator.installer.get_manifest()
    return {
        "success": True,
        "hands": [
            {"id": h.id, "name": h.name, "category": h.category, "repo_url": h.repo_url}
            for h in hands
        ],
    }
