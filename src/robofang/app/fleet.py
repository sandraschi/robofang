import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List

import psutil
from robofang.core.state import orchestrator

logger = logging.getLogger(__name__)


def _default_bridge_port() -> int:
    """Default bridge port from fleet schema (fleet-stack-ports.json)."""
    # Relative to this file's parent (app) -> configs
    path = Path(__file__).resolve().parent.parent / "configs" / "fleet-stack-ports.json"
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data.get("bridge_port"), int):
                return data["bridge_port"]
        except (OSError, json.JSONDecodeError):
            pass
    return 10871


def stop_connector(name: str) -> bool:
    """Stop a specific connector by killing its process tree."""
    # This is a simplified implementation. Real-world would track PIDs.
    # For now, we search for processes with the name in command line.
    found = False
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmd = " ".join(proc.info["cmdline"] or [])
            if name in cmd and ("python" in cmd or "powershell" in cmd):
                proc.terminate()
                found = True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return found


def stop_all_connectors():
    """Stop all running connectors."""
    for name in REPO_MAP.keys():
        stop_connector(name)


def get_active_connectors_with_ports() -> List[Dict[str, Any]]:
    """Return list of active connectors and their ports found in MCP_BACKENDS."""
    active = []
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmd = " ".join(proc.info["cmdline"] or [])
            for name, url in MCP_BACKENDS.items():
                if name in cmd and ("python" in cmd or "powershell" in cmd):
                    active.append(
                        {
                            "id": name,
                            "pid": proc.info["pid"],
                            "url": url,
                            "port": _port_from_url(url),
                        }
                    )
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return active


# ---------------------------------------------------------------------------
# MCP backend port map
# ---------------------------------------------------------------------------

MCP_BACKENDS: Dict[str, str] = {
    # Wave 1 — Home / Media
    "plex": "http://localhost:10740",
    "calibre": "http://localhost:10720",
    "home-assistant": "http://localhost:10782",
    "tapo": "http://localhost:10716",
    "netatmo": "http://localhost:10823",
    "ring": "http://localhost:10728",
    # Wave 2 — Creative Tools
    "blender": "http://localhost:10849",
    "gimp": "http://localhost:10747",
    "obs": "http://localhost:10819",
    "davinci-resolve": "http://localhost:10843",
    "reaper": "http://localhost:10797",
    "resolume": "http://localhost:10770",
    "vrchat": "http://localhost:10712",
    # Wave 3 — Infrastructure
    "virtualization": "http://localhost:10701",
    "docker": "http://localhost:10807",
    "windows-operations": "http://localhost:10749",
    "monitoring": "http://localhost:10809",
    "tailscale": "http://localhost:10821",
    # Wave 4 — Knowledge
    "advanced-memory": "http://localhost:10705",
    "notion": "http://localhost:10811",
    "fastsearch": "http://localhost:10845",
    "immich": "http://localhost:10839",
    "readly": "http://localhost:10863",
    # Wave 5 — Comms & Dev
    "email": "http://localhost:10813",
    "alexa": "http://localhost:10801",
    "rustdesk": "http://localhost:10805",
    "bookmarks": "http://localhost:10803",
    "git-github": "http://localhost:10702",
    "pywinauto": "http://localhost:10789",
    # Wave 6 — Robotics & Hands
    "unitree": "http://localhost:10831",
    "yahboom": "http://localhost:10833",
    "dreame": "http://localhost:10835",
    "hands": "http://localhost:10837",
}


def update_backends_from_topology():
    """Overlay from federation_map so config overrides defaults."""
    for _cid, _cfg in orchestrator.topology.get("connectors", {}).items():
        if isinstance(_cfg, dict) and _cfg.get("mcp_backend"):
            MCP_BACKENDS[_cid] = _cfg["mcp_backend"]


# ---------------------------------------------------------------------------
# Repository Mapping
# ---------------------------------------------------------------------------

_REPO_MAP_TEMPLATE: Dict[str, str] = {
    "plex": "plex-mcp",
    "calibre": "calibre-mcp",
    "home-assistant": "home-assistant-mcp",
    "tapo": "tapo-mcp",
    "netatmo": "netatmo-weather-mcp",
    "ring": "ring-mcp",
    "notion": "notion-mcp",
    "blender": "blender-mcp",
    "gimp": "gimp-mcp",
    "obs": "obs-mcp",
    "davinci-resolve": "davinci-resolve-mcp",
    "reaper": "reaper-mcp",
    "resolume": "resolume-mcp",
    "vrchat": "vrchat-mcp",
    "virtualization": "virtualization-mcp",
    "docker": "docker-mcp",
    "windows-operations": "windows-operations-mcp",
    "monitoring": "monitoring-mcp",
    "tailscale": "tailscale-mcp",
    "advanced-memory": "advanced-memory-mcp",
    "fastsearch": "fastsearch-mcp",
    "immich": "immich-mcp",
    "readly": "readly-mcp",
    "email": "email-mcp",
    "alexa": "alexa-mcp",
    "rustdesk": "rustdesk-mcp",
    "bookmarks": "bookmarks-mcp",
    "git-github": "git-github-mcp",
    "pywinauto": "pywinauto-mcp",
    "unitree": "unitree-robotics",
    "yahboom": "yahboom-mcp",
    "dreame": "dreame-mcp",
    "hands": "hands-mcp",
    "robotics": "robotics-mcp",
    "osc": "osc-mcp",
    "myai": "myai",
}


def _build_repo_map() -> Dict[str, str]:
    out: Dict[str, str] = {}
    root = (os.getenv("ROBOFANG_REPOS_ROOT") or "").strip()
    if not root:
        return out
    base = Path(root)
    if not base.is_dir():
        return out
    for name, rel in _REPO_MAP_TEMPLATE.items():
        path = base / rel
        if path.is_dir():
            out[name] = str(path.resolve())
    return out


REPO_MAP: Dict[str, str] = _build_repo_map()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _hands_base_dir() -> Path:
    """Resolve hands base directory (ROBOFANG_HANDS_DIR or same-as-manifest-dir/hands)."""
    env = os.getenv("ROBOFANG_HANDS_DIR", "").strip()
    if env:
        return Path(env)
    mp = getattr(orchestrator.installer, "manifest_path", None)
    if mp is not None:
        return mp.parent / "hands"
    return Path(__file__).resolve().parent.parent.parent.parent / "hands"


def _fleet_github_owner() -> str:
    """Return GitHub owner for fleet catalog (ROBOFANG_FLEET_OWNER or default: robofang)."""
    return os.getenv("ROBOFANG_FLEET_OWNER", "robofang").strip() or "robofang"


def _load_fleet_analysis() -> Dict[str, Any]:
    """Load fleet_analysis.json (written by scripts/analyze_fleet_fastmcp.py)."""
    try:
        base = _hands_base_dir()
        root = base.parent
        path = root / "fleet_analysis.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            raw = data.get("hands", {})
            if isinstance(raw, dict):
                return raw
            if isinstance(raw, list):
                return {item.get("id", ""): item for item in raw if item.get("id")}
    except (OSError, json.JSONDecodeError):
        pass
    return {}


def _load_fleet_registry() -> List[Dict[str, Any]]:
    """Load fleet from registry JSON."""
    paths_to_try: List[Path] = []
    env_path = (os.getenv("ROBOFANG_FLEET_REGISTRY") or "").strip()
    if env_path:
        paths_to_try.append(Path(env_path))
    mp = getattr(orchestrator.installer, "manifest_path", None)
    if mp is not None:
        paths_to_try.append(Path(mp).resolve().parent / "configs" / "fleet-registry.json")
    # Also check package internal configs
    paths_to_try.append(Path(__file__).resolve().parent.parent / "configs" / "fleet-registry.json")
    for path in paths_to_try:
        if path.exists() and path.is_file():
            try:
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
                fleet = data.get("fleet")
                if isinstance(fleet, list):
                    return fleet
            except (OSError, json.JSONDecodeError):
                continue
    return []


def _read_repo_metadata(repo_path: Path) -> Dict[str, Any]:
    """Read robofang.json and optionally llm.txt from repo root."""
    out: Dict[str, Any] = {}
    if not repo_path.exists() or not repo_path.is_dir():
        return out
    jpath = repo_path / "robofang.json"
    if jpath.exists():
        try:
            with open(jpath, encoding="utf-8") as f:
                data = json.load(f)
            for key in ("name", "category", "description", "webapp_script", "ports"):
                if key in data and data[key] is not None:
                    out[key] = data[key]
        except (json.JSONDecodeError, OSError):
            pass
    lpath = repo_path / "llm.txt"
    if lpath.exists():
        try:
            with open(lpath, encoding="utf-8") as f:
                raw = f.read()
            for marker in ("## RoboFang", "## Integration", "## Robofang"):
                if marker in raw:
                    raw = raw.split(marker, 1)[1].strip().lstrip("\n")
                    break
            summary = (raw[:400] or "").strip()
            if summary:
                out["integration_summary"] = summary
        except OSError:
            pass
    return out


FLEET_CATALOG_GITHUB: List[Dict[str, Any]] = [
    {
        "id": "blender-mcp",
        "name": "Blender",
        "category": "Creative",
        "description": "3D creation and scene control.",
    },
    {
        "id": "gimp-mcp",
        "name": "GIMP",
        "category": "Creative",
        "description": "Image editing and assets.",
    },
    {"id": "svg-mcp", "name": "SVG", "category": "Creative", "description": "Vector graphics."},
    {
        "id": "vrchat-mcp",
        "name": "VRChat",
        "category": "Creative",
        "description": "VRChat world and avatar control.",
    },
    {
        "id": "avatar-mcp",
        "name": "Avatar / Resonite",
        "category": "Creative",
        "description": "Resonite and avatar OSC.",
    },
    {
        "id": "plex-mcp",
        "name": "Plex",
        "category": "Media",
        "description": "Media library and playback.",
    },
    {"id": "calibre-mcp", "name": "Calibre", "category": "Media", "description": "Ebook library."},
    {
        "id": "robotics-mcp",
        "name": "Robotics",
        "category": "Robotics",
        "description": "ROS 2, Yahboom, Unitree, Dreame.",
    },
    {
        "id": "noetix-bumi-mcp",
        "name": "Noetix Bumi",
        "category": "Robotics",
        "description": "Humanoid ROS 2.",
    },
    {
        "id": "virtualization-mcp",
        "name": "Virtualization",
        "category": "Infrastructure",
        "description": "VirtualBox / VM management.",
    },
    {
        "id": "advanced-memory-mcp",
        "name": "Advanced Memory",
        "category": "Knowledge",
        "description": "RAG and knowledge graph.",
    },
    {
        "id": "rustdesk-mcp",
        "name": "RustDesk",
        "category": "Infrastructure",
        "description": "Remote desktop.",
    },
    {"id": "osc-mcp", "name": "OSC", "category": "Creative", "description": "Open Sound Control."},
    {
        "id": "ring-mcp",
        "name": "Ring",
        "category": "Home",
        "description": "Ring doorbell and cameras.",
    },
    {
        "id": "tapo-camera-mcp",
        "name": "Tapo Camera",
        "category": "Home",
        "description": "TP-Link Tapo devices.",
    },
    {
        "id": "daw-mcp",
        "name": "DAW",
        "category": "Creative",
        "description": "Digital audio workstations.",
    },
    {
        "id": "home-assistant-mcp",
        "name": "Home Assistant",
        "category": "Home",
        "description": "Home automation and IoT.",
    },
    {
        "id": "notion-mcp",
        "name": "Notion",
        "category": "Knowledge",
        "description": "Notion workspace and docs.",
    },
    {
        "id": "obs-mcp",
        "name": "OBS",
        "category": "Creative",
        "description": "Streaming and recording.",
    },
    {
        "id": "davinci-resolve-mcp",
        "name": "DaVinci Resolve",
        "category": "Creative",
        "description": "Video editing and color.",
    },
    {
        "id": "reaper-mcp",
        "name": "REAPER",
        "category": "Creative",
        "description": "DAW and audio production.",
    },
    {
        "id": "resolume-mcp",
        "name": "Resolume",
        "category": "Creative",
        "description": "VJ and live visual performance.",
    },
    {
        "id": "netatmo-weather-mcp",
        "name": "Netatmo Weather",
        "category": "Home",
        "description": "Netatmo weather stations.",
    },
    {
        "id": "fastsearch-mcp",
        "name": "FastSearch",
        "category": "Knowledge",
        "description": "Fast local search and indexing.",
    },
    {
        "id": "database-operations-mcp",
        "name": "Database Operations",
        "category": "Infrastructure",
        "description": "DB admin and operations.",
    },
    {
        "id": "meta-mcp",
        "name": "Meta MCP",
        "category": "Infrastructure",
        "description": "MCP registry and meta tools.",
    },
    {
        "id": "vbox-mcp",
        "name": "VirtualBox",
        "category": "Infrastructure",
        "description": "VirtualBox VM management.",
    },
    {
        "id": "docker-mcp",
        "name": "Docker",
        "category": "Infrastructure",
        "description": "Docker containers and images.",
    },
    {
        "id": "tailscale-mcp",
        "name": "Tailscale",
        "category": "Infrastructure",
        "description": "Tailscale VPN and mesh.",
    },
    {
        "id": "monitoring-mcp",
        "name": "Monitoring",
        "category": "Infrastructure",
        "description": "Prometheus, Grafana, Loki.",
    },
    {
        "id": "myai",
        "name": "My AI",
        "category": "Knowledge",
        "description": "Research dashboard and MCP platform framework.",
    },
]


def _fleet_catalog() -> List[Dict[str, Any]]:
    """Catalog = full fleet from registry + manifest-only entries; dedupe by id."""
    seen: set = set()
    out: List[Dict[str, Any]] = []
    base = _hands_base_dir()
    owner = _fleet_github_owner()
    registry = _load_fleet_registry()

    if registry:
        analysis = _load_fleet_analysis()
        for r in registry:
            hand_id = (r.get("id") or "").strip()
            if not hand_id or hand_id in seen:
                continue
            seen.add(hand_id)
            path = base / hand_id
            installed = path.exists() and path.is_dir()
            repo_path = (r.get("repo_path") or "").strip()
            entry = {
                "id": hand_id,
                "name": (r.get("name") or hand_id)[:100],
                "category": (r.get("category") or "Other")[:50],
                "description": (r.get("description") or "")[:200],
                "port": r.get("port", 0),
                "repo_path": repo_path,
                "repo_url": f"https://github.com/{owner}/{hand_id}",
                "installed": installed,
                "icon": (r.get("icon") or "")[:50],
            }
            if r.get("requires_app"):
                entry["requires_app"] = str(r["requires_app"])[:80]
            if r.get("app_install_url"):
                entry["app_install_url"] = str(r["app_install_url"])[:500]
            if installed:
                meta = _read_repo_metadata(path)
                for k in (
                    "name",
                    "category",
                    "description",
                    "integration_summary",
                    "webapp_script",
                    "ports",
                ):
                    if meta.get(k):
                        entry[k] = meta[k]
                if not entry.get("repo_path"):
                    entry["repo_path"] = str(path)
            a = analysis.get(hand_id, {})
            if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
                entry["fastmcp_version"] = a["fastmcp_version"]
            entry["mcpb_present"] = a.get("mcpb_present", False)
            out.append(entry)

        manifest = orchestrator.installer.get_manifest()
        for h in manifest:
            if h.id in seen:
                continue
            seen.add(h.id)
            path = base / h.id
            installed = path.exists() and path.is_dir()
            entry = {
                "id": h.id,
                "name": h.name,
                "category": h.category or "Other",
                "description": (h.description or "")[:200],
                "port": 0,
                "repo_path": str(path) if installed else "",
                "repo_url": h.repo_url,
                "installed": installed,
            }
            if installed:
                meta = _read_repo_metadata(path)
                for k in (
                    "name",
                    "category",
                    "description",
                    "integration_summary",
                    "webapp_script",
                    "ports",
                ):
                    if meta.get(k):
                        entry[k] = meta[k]
            a = analysis.get(h.id, {})
            if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
                entry["fastmcp_version"] = a["fastmcp_version"]
            entry["mcpb_present"] = a.get("mcpb_present", False)
            out.append(entry)
        return out

    # Fallback to manifest + fleet_catalog_github
    analysis = _load_fleet_analysis()
    for h in orchestrator.installer.get_manifest():
        entry = {
            "id": h.id,
            "name": h.name,
            "category": h.category or "Other",
            "description": (h.description or "")[:200],
            "repo_url": h.repo_url,
        }
        path = base / h.id
        if path.exists() and path.is_dir():
            meta = _read_repo_metadata(path)
            for k in (
                "name",
                "category",
                "description",
                "integration_summary",
                "webapp_script",
                "ports",
            ):
                if meta.get(k):
                    entry[k] = meta[k]
        a = analysis.get(h.id, {})
        if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
            entry["fastmcp_version"] = a["fastmcp_version"]
        entry["mcpb_present"] = a.get("mcpb_present", False)
        entry["installed"] = path.exists() and path.is_dir()
        out.append(entry)
        seen.add(h.id)

    for c in FLEET_CATALOG_GITHUB:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        installed_path = (base / c["id"]).exists() and (base / c["id"]).is_dir()
        repo_url = f"https://github.com/{owner}/{c['id']}"
        entry = {
            **c,
            "repo_url": repo_url,
            "description": (c.get("description") or "")[:200],
            "installed": installed_path,
        }
        a = analysis.get(c["id"], {})
        if a.get("fastmcp_version") and a["fastmcp_version"] != "not_scanned":
            entry["fastmcp_version"] = a["fastmcp_version"]
        entry["mcpb_present"] = a.get("mcpb_present", False)
        out.append(entry)
    return out


def _hand_id_to_connector(hand_id: str) -> str:
    """Map fleet catalog hand_id to connector id for MCP_BACKENDS/REPO_MAP."""
    if hand_id.endswith("-mcp"):
        return hand_id[:-4]
    return hand_id


def _port_from_url(url: str) -> int:
    """Extract port from URL."""
    if not url:
        return 0
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        if parsed.port is not None:
            return parsed.port
        return 80 if parsed.scheme == "http" else 443
    except Exception:
        return 0


def _fleet_installer_catalog() -> List[Dict[str, Any]]:
    """Installer catalog enriched for Fleet Installer UI."""
    catalog = []
    base = _hands_base_dir()
    for entry in _fleet_catalog():
        hand_id = entry.get("id", "")
        conn_id = _hand_id_to_connector(hand_id)
        port = entry.get("port", 0) or _port_from_url(MCP_BACKENDS.get(conn_id) or "")
        if not port and isinstance(entry.get("ports"), dict):
            port = entry["ports"].get("backend") or entry["ports"].get("mcp") or 0
        repo_path = (entry.get("repo_path") or "").strip()
        if not repo_path and entry.get("installed") and (base / hand_id).exists():
            repo_path = str(base / hand_id)
        if not repo_path:
            repo_path = REPO_MAP.get(conn_id) or ""
        catalog.append(
            {
                "id": hand_id,
                "name": entry.get("name", hand_id),
                "description": (entry.get("description") or "")[:300],
                "port": port,
                "repo_path": repo_path,
                "icon": entry.get("icon") or "",
                "category": entry.get("category") or "Other",
            }
        )
    return catalog


async def launch_connector(name: str):
    """Functional implementation of connector launch logic."""
    repo_path = REPO_MAP.get(name)
    path = Path(repo_path) if repo_path else None
    if not path or not path.exists() or not path.is_dir():
        hands_base = _hands_base_dir()
        fallback = hands_base / f"{name}-mcp"
        if fallback.exists() and fallback.is_dir():
            path = fallback
            repo_path = str(path)
        else:
            raise ValueError(f"MCP server '{name}' not installed.")

    start_ps1 = path / "start.ps1"
    if not start_ps1.exists():
        start_bat = path / "start.bat"
        if start_bat.exists():
            subprocess.Popen(
                [str(start_bat)],
                cwd=repo_path,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
            )
            return {"success": True, "message": f"Launched {name} via {start_bat}"}
        raise FileNotFoundError(f"Launch script not found in {repo_path}")

    try:
        subprocess.Popen(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", str(start_ps1)],
            cwd=repo_path,
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        logger.info("SOTA Trigger: Launched %s from %s", name, repo_path)
        orchestrator.storage.log_event(
            "info",
            "fleet",
            "connector_launched",
            {"name": name, "path": str(repo_path), "method": "start.ps1"},
        )
        return {"success": True, "message": f"Launched {name} via {start_ps1}"}
    except Exception as e:
        logger.error("Failed to launch connector %s: %s", name, e)
        raise e


async def auto_launch_enabled_connectors():
    """Launch enabled connectors based on environment setting."""
    if os.getenv("ROBOFANG_AUTO_LAUNCH_CONNECTORS", "").strip().lower() not in ("1", "true", "yes"):
        logger.info("Fleet Automation: Auto-launch disabled.")
        return
    logger.info("Fleet Automation: Identifying enabled connectors for auto-launch...")
    topology = orchestrator.topology
    connectors = topology.get("connectors", {})

    for name, cfg in connectors.items():
        if isinstance(cfg, dict) and cfg.get("enabled"):
            if name not in REPO_MAP:
                logger.warning(
                    "Fleet Automation: Connector '%s' enabled but no REPO_MAP entry.", name
                )
                continue
            repo_path = Path(REPO_MAP[name])
            if not repo_path.exists() or not repo_path.is_dir():
                logger.info("Fleet Automation: Skipping '%s' (not installed).", name)
                continue
            logger.info("Fleet Automation: Triggering auto-launch for '%s'", name)
            try:
                await launch_connector(name)
            except Exception as e:
                logger.error("Fleet Automation: Auto-launch failed for '%s': %s", name, e)
