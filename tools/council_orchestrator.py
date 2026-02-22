import json
from pathlib import Path


class CouncilOrchestrator:
    """
    OpenFang Council of Dozens Orchestrator
    Manages the multi-round debate state between Opus, Sonnet, and Gemini.
    """

    def __init__(self, root_dir: str):
        self.root = Path(root_dir)
        self.debate_dir = self.root / "exchange" / "debates"
        self.debate_dir.mkdir(parents=True, exist_ok=True)
        self.federation_map = self._load_json(
            self.root / "configs" / "federation_map.json"
        )
        self.system_prompt = self._load_text(
            Path(
                "C:/Users/sandr/.gemini/antigravity/brain/551ddd45-67ea-4a17-a6c3-1dfe08475bec/council_debate_prompt.md"
            )
        )

    def _load_json(self, path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _load_text(self, path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def start_debate(self, task_name: str, task_description: str):
        debate_id = task_name.lower().replace(" ", "_")
        session_file = self.debate_dir / f"{debate_id}_session.json"

        session = {
            "task": task_description,
            "rounds": [],
            "status": "IN_PROGRESS",
            "current_adjudicator": "Instigator (Gemini 3.Pro)",
        }

        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(session, f, indent=2)

        print(f"[*] Debate session '{task_name}' started.")
        print(f"[*] State stored in: {session_file}")
        return session_file

    def get_round_prompt(self, session_file: Path):
        with open(session_file, "r", encoding="utf-8") as f:
            session = json.load(f)

        round_num = len(session["rounds"]) + 1
        prompt = f"{self.system_prompt}\n\n"
        prompt += f"## CURRENT TASK: {session['task']}\n\n"
        prompt += f"## ROUND {round_num}: {session['current_adjudicator']}\n"

        if session["rounds"]:
            prompt += "### PREVIOUS ROUNDS HISTORY:\n"
            for i, r in enumerate(session["rounds"]):
                prompt += f"#### Round {i + 1} ({r['adjudicator']}):\n{r['output']}\n\n"

        return prompt


if __name__ == "__main__":
    orchestrator = CouncilOrchestrator("d:/dev/repos/openfang")
    # Example usage
    # session = orchestrator.start_debate("Open Blender Fang", "Refine the Unity-to-Blender FBX pipeline for high-performance VR avatars.")
    # print(orchestrator.get_round_prompt(session))
    print("[+] Council Orchestrator Ready.")
