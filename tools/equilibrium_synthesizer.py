import json
from pathlib import Path


def synthesize(session_file: Path, synthesis_output: str):
    root = Path("d:/dev/repos/openfang")
    output_dir = root / "exchange" / "synthesized"
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(session_file, "r", encoding="utf-8") as f:
        session = json.load(f)

    consensus_md = f"""# Consensus Plan: {session["task"]}
**Session ID**: {session_file.stem}
**Status**: Semantic Equilibrium Reached (12-Agent Council)

{synthesis_output}

---
*Synthesized by OpenFang Council of Dozens.*
"""

    output_path = output_dir / f"{session_file.stem}_consensus.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(consensus_md)

    print(f"[*] Consensus Plan synthesized to: {output_path}")
    return output_path


if __name__ == "__main__":
    # Example manual trigger
    import sys

    if len(sys.argv) > 2:
        synthesize(Path(sys.argv[1]), sys.argv[2])
    else:
        print(
            "Usage: python equilibrium_synthesizer.py <session_json> <synthesis_text>"
        )
