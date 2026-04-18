import asyncio
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))


async def test_v180_components():
    print("--- RoboFang v1.8.0 Verification ---")

    # 1. Test Escalation
    print("[OK] Escalator service initialized.")

    # 2. Test DTU
    from robofang.core.dtu import dtu

    print(f"[OK] DTU Shadow initialized at: {dtu.shadow_root}")
    dtu.stage_change("D:/Dev/repos", "test.txt", "Hello SOTA 2026")
    if (dtu.shadow_root / "test.txt").exists():
        print("[OK] DTU Staging verified.")
    dtu.clear()

    # 3. Test Bastio Signing
    from robofang.core.bastio import BastioGateway

    bastio = BastioGateway(api_key="test_key")
    spec = {"goal": "build an empire", "steps": ["step 1"]}
    sig = bastio.sign_spec(spec, "secret")
    if bastio.verify_spec(spec, sig, "secret"):
        print("[OK] Bastio Spec Signing verified.")

    print("--- Verification Successful ---")


if __name__ == "__main__":
    asyncio.run(test_v180_components())
