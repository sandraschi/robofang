import os
import sys
import asyncio

# Add src to path
sys.path.append(os.path.abspath("src"))

from robofang.core.storage import robofangStorage
from robofang.core.security import SecurityManager
from robofang.core.personality import PersonalityEngine


async def verify_persistence():
    print("--- Phase 7 Persistence Verification ---")

    # Use a test database
    db_path = "robofang_test.db"
    if os.path.exists(db_path):
        os.remove(db_path)

    storage = robofangStorage(db_path=db_path)

    print("\n[SCENARIO 1] Security Persistence")
    security = SecurityManager(storage=storage)
    security.define_policy("test_user", "admin", ["reasoning:ask", "skills:run"])

    # Check if policy is saved
    policies = storage.load_all_security_policies()
    assert "test_user" in policies
    assert policies["test_user"]["role"] == "admin"
    print("✓ Security policy persisted successfully.")

    print("\n[SCENARIO 2] Personality Persistence")
    personality = PersonalityEngine(storage=storage)
    personality.add_persona("test_persona", "You are a test persona.")

    # Check if persona is saved
    personas = storage.load_all_personas()
    print(f"DEBUG: Found personas in storage: {list(personas.keys())}")
    assert "test_persona" in personas
    assert personas["test_persona"]["system_prompt"] == "You are a test persona."
    print("✓ Personality persona persisted successfully.")

    print("\n[SCENARIO 3] Restart Persistence")
    # Simulate restart by creating new instances with same DB
    storage2 = robofangStorage(db_path=db_path)
    security2 = SecurityManager(storage=storage2)
    personality2 = PersonalityEngine(storage=storage2)

    assert await security2.is_authorized("test_user", "reasoning:ask")
    assert personality2.get_system_prompt("test_persona") == "You are a test persona."
    print("✓ Data survived simulated restart.")

    # Cleanup
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            print("! Could not remove test DB (file still in use).")
    print("\n--- Verification Complete ---")


if __name__ == "__main__":
    asyncio.run(verify_persistence())
