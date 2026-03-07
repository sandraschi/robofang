import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from openfang.mcp_server import get_substrate_heartbeat
from mcp.server.fastmcp import Context


async def test_heartbeat():
    print("Testing get_substrate_heartbeat tool...")
    # Mock context
    ctx = Context()

    try:
        result = await get_substrate_heartbeat(ctx)
        print("\n--- HEARTBEAT RESULT ---")
        import json

        print(json.dumps(result, indent=2))

        if "bastion" in result:
            print("\n[SUCCESS] Bastion authoritative data present.")
        else:
            print("\n[FAILURE] Bastion data missing.")

    except Exception as e:
        print(f"Error executing heartbeat tool: {e}")


if __name__ == "__main__":
    asyncio.run(test_heartbeat())
