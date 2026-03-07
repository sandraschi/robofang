"""OpenFang Skill Bridge: Loading and parsing legacy OpenClaw markdown skills."""

import yaml
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class SkillLoader:
    """Loads and parses skill files from the legacy skill repository."""

    def __init__(self, skills_dir: str = "C:/Users/sandr/.gemini/antigravity/skills"):
        self.skills_dir = Path(skills_dir)

    def load_skill(self, skill_id: str) -> Optional[Dict[str, Any]]:
        """Loads a specific skill by its ID (folder name)."""
        skill_path = self.skills_dir / skill_id / "SKILL.md"
        if not skill_path.exists():
            logger.warning(f"Skill file not found: {skill_path}")
            return None

        try:
            with open(skill_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Parse YAML frontmatter
            if content.startswith("---"):
                _, frontmatter, body = content.split("---", 2)
                metadata = yaml.safe_load(frontmatter)
                return {
                    "id": skill_id,
                    "metadata": metadata,
                    "prompt": body.strip(),
                    "path": str(skill_path),
                }
            else:
                return {
                    "id": skill_id,
                    "metadata": {},
                    "prompt": content.strip(),
                    "path": str(skill_path),
                }
        except Exception as e:
            logger.error(f"Failed to load skill {skill_id}: {e}")
            return None

    def list_available_skills(self) -> List[Dict[str, Any]]:
        """Lists metadata for all available skills."""
        skills = []
        if not self.skills_dir.exists():
            logger.warning(f"Skills directory not found: {self.skills_dir}")
            return []

        for item in self.skills_dir.iterdir():
            if item.is_dir():
                skill_info = self.load_skill(item.name)
                if skill_info:
                    skills.append(
                        {
                            "id": item.name,
                            "name": skill_info["metadata"].get("name", item.name),
                            "description": skill_info["metadata"].get(
                                "description", ""
                            ),
                            "tags": skill_info["metadata"].get("tags", []),
                        }
                    )
        return skills


class SkillManager:
    """Manages the skill registry and provides prompts for reasoning."""

    def __init__(self, skills_dir: str = "C:/Users/sandr/.gemini/antigravity/skills"):
        self.loader = SkillLoader(skills_dir)
        self.registry = {}
        self.refresh_registry()

    def refresh_registry(self):
        """Reloads all skills into memory."""
        self.registry = {s["id"]: s for s in self.loader.list_available_skills()}

    def get_skill_prompt(self, skill_id: str) -> Optional[str]:
        """Returns the core prompt for a skill."""
        skill_data = self.loader.load_skill(skill_id)
        if skill_data:
            return skill_data["prompt"]
        return None

    def list_skills(self) -> List[Dict[str, Any]]:
        """Returns the current skill registry."""
        return list(self.registry.values())
