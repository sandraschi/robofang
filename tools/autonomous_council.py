"""
autonomous_council.py — OpenFang Council of Dozens: Fully Autonomous Mode.

Each adjudicator is a first-class reasoner routed to the appropriate backend:
  - Ollama model   →  local LLM on any ollama-compatible endpoint
  - osc://         →  any agent reachable via OSC UDP (sensor, robot, script)
  - resonite://    →  Resonite vbot / avatar running ProtoFlux OSC handler

Model routing (per adjudicator, via env var OPENFANG_COUNCIL_MODELS):
  Plain model name:          "llama3"                  → Ollama local
  osc:// URL:                "osc://127.0.0.1:9001/robohoover-d20"
  resonite:// URL:           "resonite://127.0.0.1:9002/vbot-aria"

Embodied council members surface grounded world-state that LLMs cannot hallucinate:
  - A Resonite avatar can contribute spatial awareness, object-state, avatar interaction
    history, and ProtoFlux-computed data.
  - A virtual sensor agent (e.g. Dreame D20 Pro robohoover in Resonite) can inject a
    coverage map, obstacle coordinates, and last-sweep timestamp — the kind of
    grounded epistemic input that changes the council's risk assessment.

Resonite OSC Protocol (both sending and receiving):
  PROMPT  /openfang/council/prompt   [round_id: str, adjudicator: str, prompt: str]
  REPLY   /openfang/council/response [round_id: str, response: str]

Install prerequisites:
  uv pip install python-osc
"""

import asyncio
import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

# Allow running from tools/ directly
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from council_orchestrator import CouncilOrchestrator, ADJUDICATORS
from equilibrium_synthesizer import synthesize
from openfang.core.reasoning import ReasoningEngine
from osc_council_bridge import query_osc_agent, parse_osc_url
from cloud_council_bridge import (
    is_cloud_url,
    parse_cloud_url,
    query_cloud_adviser,
    tiebreaker_call,
)

logger = logging.getLogger("openfang.council")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL_DEFAULT = os.environ.get("OPENFANG_COUNCIL_DEFAULT_MODEL", "llama3")
MODEL_HIGH_INTEL = os.environ.get("OPENFANG_COUNCIL_HIGH_INTEL_MODEL", "llama3.1")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")

# Optional per-adjudicator model map from env
_custom_models_raw = os.environ.get("OPENFANG_COUNCIL_MODELS", "")
ADJUDICATOR_MODELS: dict[str, str] = {}
if _custom_models_raw:
    try:
        ADJUDICATOR_MODELS = json.loads(_custom_models_raw)
    except json.JSONDecodeError:
        logger.warning("OPENFANG_COUNCIL_MODELS is not valid JSON — using defaults.")

# High-intel slots: Instigator (mission setting) and Adjudicator-in-Chief (synthesis)
HIGH_INTEL_ADJUDICATORS = {"Instigator", "Adjudicator-in-Chief"}


def _model_for(adjudicator_name: str) -> str:
    """Resolve the backend for a given adjudicator. Returns the model string or a URL."""
    if adjudicator_name in ADJUDICATOR_MODELS:
        return ADJUDICATOR_MODELS[adjudicator_name]
    if adjudicator_name in HIGH_INTEL_ADJUDICATORS:
        return MODEL_HIGH_INTEL
    return MODEL_DEFAULT


def _is_osc(model: str) -> bool:
    """True if the model string is an OSC/Resonite URL."""
    return model.startswith("osc://") or model.startswith("resonite://")


def _is_cloud(model: str) -> bool:
    """True if the model string is a cloud SaaS adviser URL."""
    return is_cloud_url(model)


def _system_prompt_for(adj: dict) -> str:
    """Build a persona-specific system prompt for an adjudicator round."""
    return (
        f"You are the {adj['name']} on the OpenFang Council of Dozens.\n"
        f"Your critical lens: {adj['focus']}\n\n"
        "Review the debate history and prior rounds. Apply your specialised perspective "
        "to the current task. Be concise, blunt, and reductionist. "
        "Do not repeat what previous agents said — add new signal only. "
        "Finish with a clear recommendation or finding."
    )


# ---------------------------------------------------------------------------
# Main Council runner
# ---------------------------------------------------------------------------


class AutonomousCouncil:
    """
    Orchestrates the 12-adjudicator debate loop using live Ollama inference.

    Flow:
      1. Foreman (Instigator) opens with mission constraints.
      2. Rounds 2–11: each adjudicator reads the full debate history and adds
         their domain-specific analysis via ReasoningEngine.ask().
      3. Adjudicator-in-Chief synthesises the debate into a consensus plan
         via council_synthesis() which runs a second-pass aggregation.
      4. EquilibriumSynthesizer writes the final plan to disk.
    """

    def __init__(self, root_dir: str):
        self.orchestrator = CouncilOrchestrator(root_dir)
        self.root = Path(root_dir)
        self.engine = ReasoningEngine(ollama_url=OLLAMA_URL)

    async def close(self):
        await self.engine.close()

    async def run_session(
        self,
        task_name: str,
        task_desc: str,
        mock_mode: bool = False,
        max_retries: int = 2,
    ) -> dict:
        """
        Run a full 12-round Council debate and return the consensus plan.
        Set mock_mode=True for fast, no-Ollama-required testing.
        """
        logger.info(f"\n{'=' * 60}")
        logger.info(f"  COUNCIL SESSION: {task_name}")
        logger.info(f"{'=' * 60}")

        session_file = self.orchestrator.start_debate(task_name, task_desc)
        round_outputs: list[str] = []

        # Rounds 1–11: individual adjudicators
        for i, adj in enumerate(ADJUDICATORS[:-1]):  # all except Adjudicator-in-Chief
            adjudicator_label = self.orchestrator.step_session(session_file)
            logger.info(f"\n--- ROUND {i + 1}: {adjudicator_label} ---")

            if mock_mode:
                output = (
                    f"[MOCK] {adj['name']} ({adj['focus']}): "
                    f"Analysis complete. No issues found in scope."
                )
                await asyncio.sleep(0.05)
            else:
                prompt = self.orchestrator.get_round_prompt(session_file)
                model = _model_for(adj["name"])
                system_prompt = _system_prompt_for(adj)
                output = None

                if _is_osc(model):
                    # ── Embodied agent path (Resonite vbot / sensor agent) ──────────
                    try:
                        cfg = parse_osc_url(model)
                        logger.info(
                            f"  → OSC agent: {cfg['scheme']}://{cfg['host']}:{cfg['port']}/{cfg['label']}"
                        )
                        osc_prompt = (
                            f"[Council role: {adj['name']} | Lens: {adj['focus']}]\n\n"
                            + prompt
                        )
                        result = await query_osc_agent(
                            host=cfg["host"],
                            port=cfg["port"],
                            adjudicator=cfg["label"],
                            prompt=osc_prompt,
                            timeout=float(os.environ.get("OPENFANG_OSC_TIMEOUT", "15")),
                        )
                        output = result["response"] if result["success"] else None
                        if not result["success"]:
                            logger.warning(f"  OSC agent offline: {result['error']}")
                    except Exception as e:
                        logger.error(f"  OSC routing error for {adj['name']}: {e}")

                elif _is_cloud(model):
                    # ── Cloud SaaS adviser path ───────────────────────────────────────
                    try:
                        cfg = parse_cloud_url(model)
                        logger.info(
                            f"  → Cloud adviser: {cfg['provider']}/{cfg['model']}"
                        )
                        cloud_result = await query_cloud_adviser(
                            cloud_url=model,
                            prompt=(
                                f"[Council role: {adj['name']} | Lens: {adj['focus']}]\n\n"
                                + prompt
                            ),
                            system_prompt=_system_prompt_for(adj),
                        )
                        output = (
                            cloud_result["response"]
                            if cloud_result["success"]
                            else None
                        )
                        if not cloud_result["success"]:
                            logger.warning(
                                f"  Cloud adviser unavailable: {cloud_result['error']}"
                            )
                        else:
                            cost = cloud_result.get("estimated_cost_usd", 0.0)
                            logger.info(f"  Cloud cost: ${cost:.4f}")
                    except Exception as e:
                        logger.error(f"  Cloud routing error for {adj['name']}: {e}")

                else:
                    # ── Ollama path ──────────────────────────────────────────────────
                    logger.info(f"  → Querying Ollama model: {model}")
                    for attempt in range(max_retries):
                        result = await self.engine.ask(
                            prompt, system_prompt=system_prompt, model=model
                        )
                        if result["success"]:
                            output = result["response"]
                            break
                        logger.warning(
                            f"  Attempt {attempt + 1} failed: {result.get('error')}. Retrying…"
                        )
                        await asyncio.sleep(1)

                if output is None:
                    backend = model if _is_osc(model) else f"Ollama/{model}"
                    output = (
                        f"[OFFLINE] {adj['name']}: backend unreachable ({backend}). "
                        "No analysis available for this round."
                    )
                    logger.error(f"  Adjudicator {adj['name']} could not respond.")

            logger.info(
                f"  Output: {output[:120]}…"
                if len(output) > 120
                else f"  Output: {output}"
            )
            self.orchestrator.add_round_output(session_file, output)
            round_outputs.append(output)

        # Round 12: Adjudicator-in-Chief — synthesis via council_synthesis()
        chief = ADJUDICATORS[-1]
        chief_label = self.orchestrator.step_session(session_file)
        logger.info(f"\n--- FINAL ROUND: {chief_label} ---")

        if mock_mode:
            synthesis = (
                "## Council Consensus\n\n"
                "All domains assessed. No blocking concerns. "
                "Recommended: proceed with implementation as specified."
            )
        else:
            # Give the Chief all round outputs as a structured debate record
            final_prompt = (
                f"You are the {chief['name']}. {chief['focus']}\n\n"
                f"TASK: {task_desc}\n\n"
                "COUNCIL DEBATE (all 11 rounds):\n\n"
                + "\n\n---\n\n".join(
                    f"[{ADJUDICATORS[j]['name']}]: {out}"
                    for j, out in enumerate(round_outputs)
                )
                + "\n\nSynthesise the above into a single, actionable Executive Plan. "
                "Identify the top 3 risks, top 3 actions, and a one-sentence verdict."
            )
            model = _model_for(chief["name"])
            logger.info(f"  → Final synthesis via Ollama model: {model}")
            result = await self.engine.ask(
                final_prompt,
                system_prompt=_system_prompt_for(chief),
                model=model,
            )
            synthesis = (
                result["response"]
                if result["success"]
                else "[OFFLINE] Adjudicator-in-Chief could not reach Ollama."
            )

        self.orchestrator.add_round_output(session_file, synthesis)

        # Tiebreaker: escalate to cheapest available cloud adviser if synthesis is split
        tiebreaker_verdict: Optional[str] = None
        if not mock_mode:
            tb = await tiebreaker_call(synthesis, task_desc)
            if tb.get("invoked"):
                tiebreaker_verdict = tb["response"]
                cost = tb.get("cost", 0.0)
                logger.info(
                    f"  [TIEBREAKER] {tb['adviser']} cast a deciding vote. "
                    f"Cost: ${cost:.4f}"
                )
                logger.info(f"  [TIEBREAKER] Verdict: {tiebreaker_verdict[:120]}")
                synthesis = (
                    synthesis
                    + f"\n\n---\n**EXTERNAL TIEBREAKER** ({tb['adviser']}, est. ${cost:.4f}):\n"
                    + tiebreaker_verdict
                )
            else:
                logger.debug(f"  [TIEBREAKER] Not invoked: {tb.get('reason')}")

        # Write consensus plan to disk
        consensus_path = synthesize(session_file, synthesis)
        self.orchestrator.finalize_debate(session_file)

        logger.info("\n[✓] SEMANTIC EQUILIBRIUM REACHED.")
        logger.info(f"[*] Consensus plan: {consensus_path}")

        return {
            "session_file": str(session_file),
            "consensus_plan": str(consensus_path),
            "rounds": len(round_outputs) + 1,
            "synthesis_preview": synthesis[:300],
            "tiebreaker_invoked": tiebreaker_verdict is not None,
        }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    parser = argparse.ArgumentParser(
        description="OpenFang Autonomous Council of Dozens — Live LLM Debate"
    )
    parser.add_argument(
        "--task", type=str, required=True, help="Task name (short label)"
    )
    parser.add_argument("--desc", type=str, required=True, help="Full task description")
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Mock mode — no Ollama calls, instant outputs for testing",
    )
    parser.add_argument(
        "--root",
        type=str,
        default="d:/dev/repos/openfang",
        help="OpenFang repo root",
    )
    args = parser.parse_args()

    async def _run():
        council = AutonomousCouncil(args.root)
        try:
            result = await council.run_session(
                args.task, args.desc, mock_mode=args.mock
            )
            print("\n" + "=" * 60)
            print("COUNCIL RESULT:")
            print(f"  Session:   {result['session_file']}")
            print(f"  Consensus: {result['consensus_plan']}")
            print(f"  Rounds:    {result['rounds']}")
            print(f"\nSYNTHESIS PREVIEW:\n{result['synthesis_preview']}")
        finally:
            await council.close()

    asyncio.run(_run())


if __name__ == "__main__":
    main()
