"""
CouncilOrchestrator — manages multi-round adjudicator debate sessions.

The system prompt is resolved in this priority order:
  1. ROBOFANG_COUNCIL_PROMPT env var (full path to a .md file)
  2. <repo_root>/configs/council_debate_prompt.md  (committed default)
  3. Inline fallback string (so startup never hard-crashes)
"""

import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Repo root = tools/../
_REPO_ROOT = Path(__file__).parent.parent


def _resolve_system_prompt() -> str:
    """Load council debate system prompt from config, env, or inline fallback."""
    # 1. Explicit env override
    env_path = os.environ.get("ROBOFANG_COUNCIL_PROMPT", "")
    if env_path:
        p = Path(env_path)
        if p.exists():
            logger.info(f"Council prompt loaded from env: {p}")
            return p.read_text(encoding="utf-8")
        logger.warning(f"ROBOFANG_COUNCIL_PROMPT set but file not found: {p}")

    # 2. Default repo-local path
    default_path = _REPO_ROOT / "configs" / "council_debate_prompt.md"
    if default_path.exists():
        logger.info(f"Council prompt loaded from repo default: {default_path}")
        return default_path.read_text(encoding="utf-8")

    # 3. Inline fallback — never crashes startup
    logger.warning(
        "No council_debate_prompt.md found. Using inline fallback. "
        "Set ROBOFANG_COUNCIL_PROMPT env var or create configs/council_debate_prompt.md."
    )
    return (
        "You are an adjudicator in the RoboFang Council of Dozens. "
        "Analyse the task from your specific critical lens and provide concise, "
        "actionable output. Refer to previous rounds when contradicting them."
    )


ADJUDICATORS = [
    {
        "name": "Instigator",
        "model": "Gemini 3 Pro",
        "focus": "Mission setting and initial constraints.",
    },
    {
        "name": "Architect",
        "model": "Opus 4.6",
        "focus": "Core technical structure and design.",
    },
    {
        "name": "Debugger",
        "model": "Sonnet 4.6",
        "focus": "Implementation flaws and technical debt.",
    },
    {
        "name": "Security Bastion",
        "model": "Gemma 3 27B",
        "focus": "Sandbox escape prevention and secrets.",
    },
    {
        "name": "Performance Guru",
        "model": "Codex 5.3",
        "focus": "Optimization and latency reduction.",
    },
    {
        "name": "UX/SOTA Aestheticist",
        "model": "Claude Haiku 4",
        "focus": "Premium UI/UX standards.",
    },
    {
        "name": "Materialist Reductionist",
        "model": "Sandra Persona",
        "focus": "Empirical grounding and falsification.",
    },
    {
        "name": "Red Team / Adversary",
        "model": "Llama 3.3 70B",
        "focus": "Critical plan deconstruction.",
    },
    {
        "name": "Integration Specialist",
        "model": "Gemini 3 Flash",
        "focus": "Fleet compatibility and port mapping.",
    },
    {
        "name": "Documentation Chronicler",
        "model": "GPT-4o",
        "focus": "Traceability and ADN indexing.",
    },
    {
        "name": "Scalability Engineer",
        "model": "Qwen 2.5 32B",
        "focus": "Long-term architectural health.",
    },
    {
        "name": "Adjudicator-in-Chief",
        "model": "Gemini 3 Deep Think",
        "focus": "Consensus reaching and final synthesis.",
    },
]


class CouncilOrchestrator:
    """
    Manages multi-round debate sessions between the Council of Dozens adjudicators.
    Sessions are persisted as JSON under exchange/debates/.
    """

    def __init__(self, root_dir: str = str(_REPO_ROOT)):
        self.root = Path(root_dir)
        self.debate_dir = self.root / "exchange" / "debates"
        self.debate_dir.mkdir(parents=True, exist_ok=True)

        federation_path = self.root / "configs" / "federation_map.json"
        self.federation_map = self._load_json(federation_path) if federation_path.exists() else {}

        self.system_prompt = _resolve_system_prompt()

        try:
            from skill_bridge import SkillBridge

            self.skills = SkillBridge()
        except ImportError:
            self.skills = None
            logger.debug("SkillBridge not available — proceeding without skills.")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _load_json(path: Path) -> dict:
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    def start_debate(self, task_name: str, task_description: str) -> Path:
        debate_id = task_name.lower().replace(" ", "_")
        session_file = self.debate_dir / f"{debate_id}_session.json"

        session = {
            "task": task_description,
            "rounds": [],
            "status": "IN_PROGRESS",
            "current_adjudicator": ADJUDICATORS[0]["name"] + f" ({ADJUDICATORS[0]['model']})",
            "current_focus": ADJUDICATORS[0]["focus"],
        }
        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(session, f, indent=2)

        logger.info(f"Debate session '{task_name}' started: {session_file}")
        return session_file

    def step_session(self, session_file: Path) -> str:
        """Advance to the next adjudicator; return their label."""
        with open(session_file, encoding="utf-8") as f:
            session = json.load(f)

        current_idx = 0
        if session["rounds"]:
            last_adj = session["rounds"][-1]["adjudicator"]
            for i, adj in enumerate(ADJUDICATORS):
                if adj["name"] in last_adj:
                    current_idx = (i + 1) % len(ADJUDICATORS)
                    break

        target = ADJUDICATORS[current_idx]
        session["current_adjudicator"] = f"{target['name']} ({target['model']})"
        session["current_focus"] = target["focus"]

        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(session, f, indent=2)

        return session["current_adjudicator"]

    def add_round_output(self, session_file: Path, output: str) -> None:
        """Record the output of the current adjudicator round."""
        with open(session_file, encoding="utf-8") as f:
            session = json.load(f)

        new_round = {
            "round": len(session["rounds"]) + 1,
            "adjudicator": session["current_adjudicator"],
            "focus": session.get("current_focus", ""),
            "output": output,
        }
        session["rounds"].append(new_round)

        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(session, f, indent=2)

        logger.info(f"Round {new_round['round']} recorded for {new_round['adjudicator']}")

    def get_round_prompt(self, session_file: Path) -> str:
        """Build the full prompt for the current adjudicator including debate history."""
        with open(session_file, encoding="utf-8") as f:
            session = json.load(f)

        round_num = len(session["rounds"]) + 1
        lines = [
            self.system_prompt,
            "",
            f"## CURRENT TASK: {session['task']}",
            "",
            f"## ROUND {round_num}: {session['current_adjudicator']}",
            f"**Your lens:** {session.get('current_focus', '')}",
        ]

        if session["rounds"]:
            lines.append("\n### PREVIOUS ROUNDS HISTORY:")
            for r in session["rounds"]:
                lines.append(f"\n#### Round {r['round']} ({r['adjudicator']}):\n{r['output']}")

        return "\n".join(lines)

    def finalize_debate(self, session_file: Path) -> None:
        """Mark a session as complete."""
        with open(session_file, encoding="utf-8") as f:
            session = json.load(f)
        session["status"] = "COMPLETE"
        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(session, f, indent=2)
        logger.info(f"Debate session finalized: {session_file}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    orchestrator = CouncilOrchestrator()
    print("[+] Council Orchestrator Ready.")
    print(f"    Debate dir : {orchestrator.debate_dir}")
    print(f"    Adjudicators: {len(ADJUDICATORS)}")
    print(f"    System prompt: {len(orchestrator.system_prompt)} chars")
