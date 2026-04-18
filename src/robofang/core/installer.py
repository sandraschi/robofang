import logging
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

GIT_CLONE_TIMEOUT = 300
INSTALL_SCRIPT_TIMEOUT = 600
DEPS_INSTALL_TIMEOUT = 300


def _install_deps(target_dir: Path) -> str | None:
    """Install Python deps so the MCP server is usable. uv sync if pyproject.toml else pip install -e ..
    Return None on success, else error message."""
    pyproject = target_dir / "pyproject.toml"
    setup_py = target_dir / "setup.py"
    if not pyproject.exists() and not setup_py.exists():
        return None
    # Prefer uv sync when pyproject.toml exists
    if pyproject.exists():
        try:
            r = subprocess.run(
                ["uv", "sync"],
                cwd=str(target_dir),
                capture_output=True,
                text=True,
                timeout=DEPS_INSTALL_TIMEOUT,
            )
            if r.returncode == 0:
                logger.info("uv sync succeeded in %s", target_dir)
                return None
            err = (r.stderr or r.stdout or "").strip() or f"uv sync exit {r.returncode}"
            logger.warning("uv sync failed in %s: %s; trying pip install -e .", target_dir, err)
        except FileNotFoundError:
            logger.info("uv not in PATH, using pip install -e .")
        except subprocess.TimeoutExpired:
            return "uv sync timed out. Run uv sync or pip install -e . manually in the hand directory."
    # pip install -e .
    try:
        r = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-e", "."],
            cwd=str(target_dir),
            capture_output=True,
            text=True,
            timeout=DEPS_INSTALL_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return "pip install -e . timed out. Run uv sync or pip install -e . manually in the hand directory."
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip() or f"pip install -e . exit {r.returncode}"
        return f"pip install -e . failed: {err}"
    logger.info("pip install -e . succeeded in %s", target_dir)
    return None


def _github_owner_repo(repo_url: str) -> tuple[str, str] | None:
    """Return (owner, repo) if repo_url is a GitHub HTTPS/SSH URL, else None."""
    url = (repo_url or "").strip().rstrip("/").replace(".git", "")
    if "github.com" not in url:
        return None
    try:
        if url.startswith("git@github.com:"):
            path = url.split(":", 1)[1]
        elif "://" in url:
            parsed = urlparse(url)
            path = (parsed.path or "").strip("/")
        else:
            parsed = urlparse("https://" + url)
            path = (parsed.path or "").strip("/")
        parts = path.split("/")
        if len(parts) >= 2:
            return (parts[0], parts[1])
    except Exception:
        pass
    return None


class HandManifestItem(BaseModel):
    id: str
    name: str
    category: str
    description: str
    repo_url: str
    install_script: str | None = "start.ps1"
    tags: list[str] = Field(default_factory=list)


class HandInstaller:
    """Handles the selective installation of MCP servers (Hands)."""

    def __init__(self, manifest_path: Path, hands_base_dir: Path):
        self.manifest_path = manifest_path
        self.hands_base_dir = hands_base_dir
        self.hands_base_dir.mkdir(parents=True, exist_ok=True)

    def get_manifest(self) -> list[HandManifestItem]:
        if not self.manifest_path.exists():
            logger.error(f"Manifest not found at {self.manifest_path}")
            return []

        try:
            with open(self.manifest_path, encoding="utf-8") as f:
                data = yaml.safe_load(f)
            return [HandManifestItem(**h) for h in data.get("hands", [])]
        except Exception as e:
            logger.error(f"Failed to load manifest: {e}")
            return []

    def install(self, hand_id: str) -> dict[str, Any]:
        items = self.get_manifest()
        item = next((i for i in items if i.id == hand_id), None)

        if not item:
            return {"success": False, "error": f"Hand '{hand_id}' not found in manifest."}

        target_dir = self.hands_base_dir / hand_id
        if target_dir.exists():
            return {
                "success": True,
                "message": f"Hand '{hand_id}' already installed at {target_dir}.",
            }

        logger.info("Cloning %s from %s...", item.name, item.repo_url)
        try:
            gh_slug = _github_owner_repo(item.repo_url)
            if not gh_slug:
                return {
                    "success": False,
                    "error": "Only GitHub repositories are supported. Use a GitHub repo URL and clone with gh.",
                }
            owner, repo = gh_slug
            try:
                r = subprocess.run(
                    ["gh", "repo", "clone", f"{owner}/{repo}", str(target_dir)],
                    capture_output=True,
                    text=True,
                    timeout=GIT_CLONE_TIMEOUT,
                )
                if r.returncode != 0:
                    err = (r.stderr or r.stdout or "").strip() or f"gh repo clone exit {r.returncode}"
                    logger.error("gh repo clone failed for %s: %s", hand_id, err)
                    return {"success": False, "error": f"gh repo clone failed: {err}"}
            except FileNotFoundError:
                logger.error("gh not in PATH for %s", hand_id)
                return {
                    "success": False,
                    "error": "GitHub CLI (gh) not found in PATH. Install from https://cli.github.com/ and ensure gh is on PATH.",
                }

            dep_err = _install_deps(target_dir)
            if dep_err:
                return {"success": False, "error": dep_err}

            if item.install_script:
                script_path = target_dir / item.install_script
                if script_path.exists():
                    logger.info("Running install script: %s", item.install_script)
                    if script_path.suffix == ".ps1":
                        for cmd in (
                            ["pwsh", "-File", str(script_path)],
                            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(script_path)],
                        ):
                            try:
                                r = subprocess.run(
                                    cmd,
                                    cwd=str(target_dir),
                                    capture_output=True,
                                    text=True,
                                    timeout=INSTALL_SCRIPT_TIMEOUT,
                                )
                                if r.returncode != 0:
                                    err = (r.stderr or r.stdout or "").strip() or f"exit {r.returncode}"
                                    logger.warning("Install script failed (%s): %s", cmd[0], err)
                                    return {
                                        "success": False,
                                        "error": f"Install script failed: {err}",
                                    }
                                break
                            except FileNotFoundError:
                                continue
                        else:
                            return {
                                "success": False,
                                "error": "PowerShell not found (tried pwsh and powershell).",
                            }
                    else:
                        r = subprocess.run(
                            [str(script_path)],
                            cwd=str(target_dir),
                            capture_output=True,
                            text=True,
                            timeout=INSTALL_SCRIPT_TIMEOUT,
                            shell=True,
                        )
                        if r.returncode != 0:
                            err = (r.stderr or r.stdout or "").strip() or f"exit {r.returncode}"
                            return {"success": False, "error": f"Install script failed: {err}"}

            return {"success": True, "message": f"Successfully installed {item.name}."}
        except subprocess.TimeoutExpired as e:
            logger.error("Install timeout for %s: %s", hand_id, e)
            return {"success": False, "error": f"Install timed out after {e.timeout}s."}
        except subprocess.CalledProcessError as e:
            logger.error("Installation failed for %s: %s", hand_id, e)
            err = getattr(e, "stderr", "") or getattr(e, "output", "") or str(e)
            return {"success": False, "error": f"Process failed: {err}"}
        except FileNotFoundError as e:
            logger.error("gh or script not found for %s: %s", hand_id, e)
            return {
                "success": False,
                "error": "GitHub CLI (gh) or install script not found. Install gh from https://cli.github.com/ and ensure it is on PATH.",
            }
        except Exception as e:
            logger.exception("Installation failed for %s", hand_id)
            return {"success": False, "error": str(e)}

    def add_hand_to_manifest(self, item: HandManifestItem) -> None:
        """Append a hand to fleet_manifest.yaml. Preserves existing entries and optional keys."""
        data = {}
        if self.manifest_path.exists():
            try:
                with open(self.manifest_path, encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
            except Exception as e:
                logger.error("Failed to load manifest for append: %s", e)
                raise
        hands = list(data.get("hands", []))
        if any((h.get("id") == item.id) for h in hands):
            raise ValueError("Hand '%s' already in manifest." % item.id)
        hands.append(item.model_dump())
        data["hands"] = hands
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.manifest_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        logger.info("Added hand '%s' to fleet manifest.", item.id)
