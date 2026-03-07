import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from openfang.core.reasoning import ReasoningEngine


async def test_council():
    print("Initializing ReasoningEngine...")
    engine = ReasoningEngine(use_ollama=True)

    # Council Members updated in federation_map.json
    council = ["llama3.2:3b", "deepseek-r1:8b", "qwen2.5:7b"]

    prompt = "What is the primary directive of a Dark Integration agent?"

    print(f"Requesting Council Synthesis (Members: {council})...")
    try:
        result = await engine.council_synthesis(prompt=prompt, council_members=council)

        print("\n--- COUNCIL SYNTHESIS RESULT ---")
        print(f"Success: {result['success']}")
        if result["success"]:
            print(f"Final Consensus: {result['response']}")
            print("\nMember Thoughts (Summarized):")
            for i, member_res in enumerate(result["metadata"]["member_responses"]):
                member_name = council[i]
                response_text = member_res.get("response", "N/A")
                print(f"[{member_name}]: {response_text[:100]}...")
        else:
            print(f"Error: {result.get('error')}")

    except Exception as e:
        print(f"Fatal Error during synthesis: {e}")


if __name__ == "__main__":
    asyncio.run(test_council())
