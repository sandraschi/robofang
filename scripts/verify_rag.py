import asyncio
import logging
import sys
import os

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from openfang.core.orchestrator import OrchestrationClient
from openfang.core.storage import OpenFangStorage


async def verify_rag():
    logging.basicConfig(level=logging.INFO)

    # Use a test database
    db_path = "rag_test.db"
    if os.path.exists(db_path):
        os.remove(db_path)

    storage = OpenFangStorage(db_path=db_path)
    client = OrchestrationClient(storage=storage)

    print("\n--- Phase 8: Auto-RAG Verification ---")

    # Test 1: Ask with RAG (subject 'guest' should have permission now)
    prompt = "What is the status of the fleet?"
    print("Testing ask(use_rag=True) for guest...")

    # We mock the reasoning engine's ask to see the final prompt it receives
    original_ask = client.reasoning.ask
    captured_prompt = None

    async def mock_ask(p, system_prompt=None, model="llama3"):
        nonlocal captured_prompt
        captured_prompt = p
        return {"success": True, "response": "Mocked response", "model": model}

    client.reasoning.ask = mock_ask

    await client.ask(prompt, use_rag=True, subject="guest")

    if captured_prompt and "RELEVANT CONTEXT:" in captured_prompt:
        print("✅ [SUCCESS] Prompt was augmented with context.")
        print(f"Final Prompt Preview:\n{captured_prompt[:200]}...")
    else:
        print("❌ [FAILURE] Prompt was NOT augmented with context.")
        print(f"Final Prompt: {captured_prompt}")

    # Test 2: Ask without RAG
    captured_prompt = None
    await client.ask(prompt, use_rag=False, subject="guest")

    if captured_prompt == prompt:
        print("✅ [SUCCESS] Prompt was NOT augmented when use_rag=False.")
    else:
        print("❌ [FAILURE] Prompt was unexpectedly augmented.")

    # Cleanup
    client.reasoning.ask = original_ask
    if os.path.exists(db_path):
        try:
            # We don't call storage.close() because it doesn't exist,
            # SQLite connection will close on object destruction
            del storage
            del client
            import gc

            gc.collect()
            os.remove(db_path)
        except Exception as e:
            print(f"Note: Cleanup failed (likely file lock): {e}")
    print("\nVerification Complete.")


if __name__ == "__main__":
    asyncio.run(verify_rag())
