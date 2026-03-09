"""Test scaffold for RingConnector.

Uses ring_doorbell library. Token cached in devices-mcp/ring_token.cache.
Account credentials from devices-mcp/config.yaml.

Run: python tests/connectors/test_ring.py
"""

import asyncio
import logging
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

RING_CONFIG = {
    "email": "sandraschipal@hotmail.com",
    "password": "Sec1000ri#",
    # Use the already-cached token from devices-mcp to avoid 2FA prompt
    "token_file": r"D:\dev\repos\devices-mcp\ring_token.cache",
}


async def test_connect():
    print("\n=== test_connect ===")
    from robofang.core.connectors import RingConnector

    conn = RingConnector("ring", RING_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}")
    if conn._ring:
        devices = conn._ring.devices()
        for dtype, dlist in devices.items():
            for d in dlist:
                print(f"  [{dtype}] {d.name}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: Ring not reachable — check token / network")


async def test_get_messages():
    print("\n=== test_get_messages (recent events) ===")
    from robofang.core.connectors import RingConnector

    conn = RingConnector("ring", RING_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    events = await conn.get_messages(limit=10)
    for e in events:
        print(f"  [{e.get('created_at', '')[:19]}] {e.get('device')} — {e.get('kind')}")
    await conn.disconnect()
    assert isinstance(events, list)
    print(f"PASS — {len(events)} events")


async def main():
    await test_connect()
    await test_get_messages()
    # Ring send_message is read-only by API design — no actuation test
    print("\nAll Ring tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
