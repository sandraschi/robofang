import sys
from pathlib import Path

sys.path.append(str(Path("d:/dev/repos/openfang/tools")))
from council_orchestrator import CouncilOrchestrator


def main():
    root = "d:/dev/repos/openfang"
    orchestrator = CouncilOrchestrator(root)
    session_file = (
        Path(root) / "exchange" / "debates" / "resonite_spatial_vlm_session.json"
    )

    debugger_output = """
## The "Gorgon-Eye" Red-Team Review (Debugger Critique)

The proposed architecture has high-risk synchronization issues. We must mitigate the "Luddite" traps of state-latency and engine instability.

### Critical Fixes:
1.  **Frame-ID Syncer**: Implement a transaction-based sync where PCAS blobs and OSC deltas share a unique Frame-ID.
2.  **OSC Batching**: Throttling updates to 30fps and using OSC bundles to prevent Resonite overhead.
3.  **Port Allocation**: Resonite Bridge moved to **Port 10820** to avoid fleet collisions.
4.  **Token Scoping**: WebMCP tokens for ProtoFlux rewriting must be sandbox-isolated.

### Reliability Check:
Without Frame-Sync, the VLM is "hallucinating" in the past. Correct this before execution.
"""

    orchestrator.add_round_output(session_file, debugger_output)
    print("[*] Debugger output recorded.")


if __name__ == "__main__":
    main()
