from pathlib import Path
from typing import List, Dict


class SkillBridge:
    """
    OpenFang Skill Facility Bridge
    Connects OpenFang to the Anthropic/OpenClaw skill repository.
    """

    def __init__(self, skills_root: str = "C:/Users/sandr/.gemini/antigravity/skills"):
        self.skills_root = Path(skills_root)

    def list_skills(self) -> List[Dict[str, str]]:
        """
        Lists all available skills in the repository.
        """
        skills = []
        if not self.skills_root.exists():
            return []

        for skill_dir in self.skills_root.iterdir():
            if skill_dir.is_dir():
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    # Basic extraction of name/description from MD frontmatter or content
                    skills.append({"id": skill_dir.name, "path": str(skill_file)})
        return skills

    def get_skill_content(self, skill_id: str) -> str:
        """
        Retrieves the full content of a skill.
        """
        skill_file = self.skills_root / skill_id / "SKILL.md"
        if skill_file.exists():
            with open(skill_file, "r", encoding="utf-8") as f:
                return f.read()
        return f"Error: Skill {skill_id} not found."


if __name__ == "__main__":
    bridge = SkillBridge()
    print(f"[*] Found {len(bridge.list_skills())} skills.")
    # Example: print(bridge.get_skill_content("python-debugging-expert"))
