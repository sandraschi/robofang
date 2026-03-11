import asyncio
import logging

from robofang.core.orchestrator import OrchestrationClient

logging.basicConfig(level=logging.INFO)


async def verify_hands():
    print("\n--- RoboFang 15-Hand Fleet Discovery Verification ---")
    orch = OrchestrationClient()

    hands_status = orch.hands.get_hands_status()
    print(f"Total Hands Discovered: {len(hands_status)}")

    categories = {}
    for h in hands_status:
        cat = h["category"]
        categories[cat] = categories.get(cat, 0) + 1
        print(f"  [{h['category'].upper()}] {h['name']} ({h['id']}) - Icon: {h['icon']}")

    print("\nSummary by Category:")
    for cat, count in categories.items():
        print(f"  - {cat}: {count}")

    # Check for specific expected hands
    expected = [
        "musician",
        "pa",
        "patroller",
        "doctor",
        "avatar",
        "housemaker",
        "dancer",
        "cook",
        "collector",
        "lead",
        "clip",
        "predictor",
        "researcher",
        "twitter",
        "browser",
    ]
    missing = [e for e in expected if not any(h["id"] == e for h in hands_status)]

    if not missing:
        print(f"\n[SUCCESS] All {len(expected)} hands successfully registered.")
    else:
        print(f"\n[FAILURE] Missing hands: {missing}")


if __name__ == "__main__":
    asyncio.run(verify_hands())
