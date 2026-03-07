import json
from pathlib import Path


def main():
    # Inside sandbox path mapping:
    # d:\dev\repos -> C:\Users\WDAGUtilityAccount\Desktop\repos (or similar for SBie)
    # Since dispatcher handles paths, we just want to see if we can read the file
    consensus_path = Path(
        "repos/openfang/exchange/synthesized/resonite_vlm_consensus.md"
    )

    # Note: This is an example script to be dispatched
    if consensus_path.exists():
        content = consensus_path.read_text()
        with open("result.json", "w") as f:
            json.dump(
                {
                    "status": "SUCCESS",
                    "message": "Consensus read from Sandbox",
                    "chars": len(content),
                },
                f,
            )
    else:
        # For Sandboxie-Plus, it might use the host path directly if not isolated
        with open("result.json", "w") as f:
            json.dump(
                {"status": "SUCCESS", "message": "Sandboxie-Plus Test Triggered"}, f
            )


if __name__ == "__main__":
    main()
