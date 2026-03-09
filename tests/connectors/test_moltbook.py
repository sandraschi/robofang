"""Test scaffold for MoltbookConnector.

Run: python tests/connectors/test_moltbook.py
Requires MOLTBOOK_API_KEY env var (or set it below).
"""

import asyncio
import logging
import os
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

MOLTBOOK_API_KEY = os.getenv("MOLTBOOK_API_KEY", "")  # set in env or here


async def test_connect():
    print("\n=== test_connect ===")
    from robofang.core.connectors import MoltbookConnector

    conn = MoltbookConnector("moltbook", {"api_key": MOLTBOOK_API_KEY})
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}")
    await conn.disconnect()
    assert isinstance(ok, bool), "connect() must return bool"
    print("PASS" if ok else "WARN: unreachable (check API key / network)")


async def test_get_messages():
    print("\n=== test_get_messages ===")
    from robofang.core.connectors import MoltbookConnector

    conn = MoltbookConnector("moltbook", {"api_key": MOLTBOOK_API_KEY})
    await conn.connect()
    msgs = await conn.get_messages(limit=5)
    print(f"get_messages(5) -> {len(msgs)} items")
    for m in msgs[:2]:
        print(f"  {m}")
    await conn.disconnect()
    assert isinstance(msgs, list), "get_messages() must return list"
    print("PASS")


async def test_send_message():
    print("\n=== test_send_message ===")
    from robofang.core.connectors import MoltbookConnector

    conn = MoltbookConnector("moltbook", {"api_key": MOLTBOOK_API_KEY})
    await conn.connect()
    ok = await conn.send_message(
        "feed", "[robofang test] MoltbookConnector scaffold check"
    )
    print(f"send_message() -> {ok}")
    await conn.disconnect()
    assert isinstance(ok, bool)
    print("PASS" if ok else "WARN: post failed (check API key)")


async def main():
    await test_connect()
    await test_get_messages()
    await test_send_message()
    print("\nAll Moltbook tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
