import sys
from pathlib import Path

sys.path.append(str(Path("d:/dev/repos/RoboFang/tools")))
from council_orchestrator import CouncilOrchestrator


def main():
    root = "d:/dev/repos/RoboFang"
    orchestrator = CouncilOrchestrator(root)

    # 1. Start or Resume the Resonite Session
    task_name = "Resonite Spatial VLM"
    task_desc = "Architect a spatially-aware VLM system for Resonite that can manipulate ProtoFlux and 3D primitives via WebMCP or OSC."

    session_file = Path(root) / "exchange" / "debates" / "resonite_spatial_vlm_session.json"

    if not session_file.exists():
        session_file = orchestrator.start_debate(task_name, task_desc)

    # 2. Get the prompt for the current round
    adj = orchestrator.step_session(session_file)
    prompt = orchestrator.get_round_prompt(session_file)

    print(f"--- COUNCIL ROUND START: {adj} ---")
    print(prompt)


if __name__ == "__main__":
    main()
