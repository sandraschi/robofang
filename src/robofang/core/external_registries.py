"""
Discovery and mapping from external MCP registries (MCP Registry API, Docker MCP catalog, GitHub).
Used by /api/fleet/discover and /api/fleet/add-from-external.
"""

import logging
import re
import subprocess
from typing import Any
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

REGISTRY_BASE = "https://registry.modelcontextprotocol.io"
REGISTRY_SERVERS_PATH = "/v0.1/servers"
REGISTRY_VERSION_PATH = "/v0.1/servers/{name}/versions/latest"


def _registry_name_to_id(name: str) -> str:
    """Convert registry server name (e.g. io.modelcontextprotocol/everything) to a hand id."""
    return name.replace("/", "-").replace(".", "-").lower()


async def discover_registry(limit: int = 50) -> list[dict[str, Any]]:
    """
    Fetch discoverable MCP servers from the official MCP Registry API.
    Returns list of { id, name, description, repo_url?, source: "registry" }.
    """
    items: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"{REGISTRY_BASE}{REGISTRY_SERVERS_PATH}"
            params = {"limit": min(limit, 100)}
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        logger.warning("Registry discovery failed: %s", e)
        return []
    except Exception as e:
        logger.warning("Registry discovery error: %s", e)
        return []

    servers = data.get("servers") or data.get("items") or []
    for s in servers[:limit]:
        name = s.get("name") or s.get("id") or ""
        if not name:
            continue
        raw_id = _registry_name_to_id(name)
        items.append(
            {
                "id": raw_id,
                "name": name,
                "description": s.get("description") or s.get("summary") or "",
                "repo_url": s.get("repository") or s.get("repo_url") or s.get("url") or "",
                "source": "registry",
            }
        )
    return items


async def get_registry_server_repo(server_name: str) -> str | None:
    """Fetch latest version for a server and return repository URL if present."""
    try:
        encoded = quote(server_name, safe="")
        path = REGISTRY_VERSION_PATH.format(name=encoded)
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{REGISTRY_BASE}{path}")
            if r.status_code != 200:
                return None
            data = r.json()
            return (
                data.get("repository")
                or data.get("repo_url")
                or data.get("url")
                or (data.get("package") or {}).get("repository")
            )
    except Exception as e:
        logger.debug("get_registry_server_repo %s: %s", server_name, e)
        return None


def discover_docker() -> list[dict[str, Any]]:
    """
    List MCP servers from Docker MCP catalog (docker mcp catalog server ls).
    Returns list of { id, name, source: "docker" }. May return [] if Docker CLI unavailable.
    """
    items: list[dict[str, Any]] = []
    try:
        result = subprocess.run(
            ["docker", "mcp", "catalog", "server", "ls"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            logger.debug("Docker MCP catalog failed: %s", result.stderr)
            return []
        for line in (result.stdout or "").strip().splitlines():
            line = line.strip()
            if not line or line.startswith("NAME") or line.startswith("---"):
                continue
            # First column is often the name/id
            parts = line.split()
            name = parts[0] if parts else line
            raw_id = name.replace("/", "-").replace(":", "-").lower()
            items.append({"id": raw_id, "name": name, "source": "docker"})
    except FileNotFoundError:
        logger.debug("Docker CLI not found")
    except subprocess.TimeoutExpired:
        logger.warning("Docker MCP catalog timed out")
    except Exception as e:
        logger.warning("Docker discovery error: %s", e)
    return items


GITHUB_RE = re.compile(
    r"^(https?://)?(www\.)?github\.com/([^/]+)/([^/]+?)(\.git)?/?$",
    re.IGNORECASE,
)


def normalize_github_repo_url(url: str) -> str | None:
    """Return clone URL for a GitHub repo (https://github.com/owner/repo)."""
    if not url or not url.strip():
        return None
    url = url.strip()
    m = GITHUB_RE.match(url)
    if not m:
        return None
    owner, repo = m.group(3), m.group(4)
    if repo.endswith(".git"):
        repo = repo[:-4]
    return f"https://github.com/{owner}/{repo}"
