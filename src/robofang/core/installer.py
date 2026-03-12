import logging
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class HandManifestItem(BaseModel):
    id: str
    name: str
    category: str
    description: str
    repo_url: str
    install_script: Optional[str] = "start.ps1"
    tags: List[str] = Field(default_factory=list)


class HandInstaller:
    """Handles the selective installation of MCP servers (Hands)."""

    def __init__(self, manifest_path: Path, hands_base_dir: Path):
        self.manifest_path = manifest_path
        self.hands_base_dir = hands_base_dir
        self.hands_base_dir.mkdir(parents=True, exist_ok=True)

    def get_manifest(self) -> List[HandManifestItem]:
        if not self.manifest_path.exists():
            logger.error(f"Manifest not found at {self.manifest_path}")
            return []

        try:
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            return [HandManifestItem(**h) for h in data.get("hands", [])]
        except Exception as e:
            logger.error(f"Failed to load manifest: {e}")
            return []

    def install(self, hand_id: str) -> Dict[str, Any]:
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

        logger.info(f"Cloning {item.name} from {item.repo_url}...")
        try:
            # We use git clone. On Windows, ensure git is in PATH.
            subprocess.run(["git", "clone", item.repo_url, str(target_dir)], check=True)

            if item.install_script:
                script_path = target_dir / item.install_script
                if script_path.exists():
                    logger.info(f"Running install script: {item.install_script}")
                    # Use powershell for .ps1 scripts
                    if script_path.suffix == ".ps1":
                        subprocess.run(
                            ["pwsh", "-File", str(script_path)], cwd=str(target_dir), check=True
                        )
                    else:
                        subprocess.run(
                            [str(script_path)], cwd=str(target_dir), check=True, shell=True
                        )

            return {"success": True, "message": f"Successfully installed {item.name}."}
        except subprocess.CalledProcessError as e:
            logger.error(f"Installation failed for {hand_id}: {e}")
            return {"success": False, "error": f"Process failed: {e!s}"}
        except Exception as e:
            logger.error(f"Error during installation of {hand_id}: {e}")
            return {"success": False, "error": str(e)}

    def add_hand_to_manifest(self, item: HandManifestItem) -> None:
        """Append a hand to fleet_manifest.yaml. Preserves existing entries and optional keys."""
        data = {}
        if self.manifest_path.exists():
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
            except Exception as e:
                logger.error(f"Failed to load manifest for append: {e}")
                raise
        hands = list(data.get("hands", []))
        if any((h.get("id") == item.id) for h in hands):
            raise ValueError(f"Hand '{item.id}' already in manifest.")
        hands.append(item.model_dump())
        data["hands"] = hands
        with open(self.manifest_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        logger.info(f"Added hand '{item.id}' to fleet manifest.")
