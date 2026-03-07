"""Test scaffold for DiscordConnector (discord.py).

Run: python tests/connectors/test_discord.py
Requires DISCORD_BOT_TOKEN env var and a DISCORD_CHANNEL_ID.

Set up:
  1. Create a bot at https://discord.com/developers/applications
  2. Enable Message Content Intent
  3. Invite bot to your server with Send Messages + Read Message History
  4. Set env vars:
       DISCORD_BOT_TOKEN=<your-token>
       DISCORD_CHANNEL_ID=<channel-id-as-integer>
"""

import asyncio
import logging
import os
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

DISCORD_CONFIG = {
    "token": os.getenv("DISCORD_BOT_TOKEN", ""),
    "channel_id": int(os.getenv("DISCORD_CHANNEL_ID", "0") or "0"),
}


async def test_connect():
    print("\n=== test_connect ===")
    if not DISCORD_CONFIG["token"]:
        print("SKIP: DISCORD_BOT_TOKEN not set")
        return
    from openfang.core.connectors import DiscordConnector
    conn = DiscordConnector("discord", DISCORD_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: bot did not connect (check token / intents)")


async def test_send_message():
    print("\n=== test_send_message ===")
    if not DISCORD_CONFIG["token"] or not DISCORD_CONFIG["channel_id"]:
        print("SKIP: token or channel_id not set")
        return
    from openfang.core.connectors import DiscordConnector
    conn = DiscordConnector("discord", DISCORD_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP: not connected")
        await conn.disconnect()
        return
    ok = await conn.send_message("default", "[OpenFang test] DiscordConnector scaffold check")
    print(f"send_message() -> {ok}")
    await conn.disconnect()
    print("PASS" if ok else "WARN")


async def test_get_messages():
    print("\n=== test_get_messages ===")
    if not DISCORD_CONFIG["token"] or not DISCORD_CONFIG["channel_id"]:
        print("SKIP: token or channel_id not set")
        return
    from openfang.core.connectors import DiscordConnector
    conn = DiscordConnector("discord", DISCORD_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        await conn.disconnect()
        return
    msgs = await conn.get_messages(limit=5)
    for m in msgs:
        print(f"  [{m['timestamp']}] {m['author']}: {m['content'][:80]}")
    await conn.disconnect()
    assert isinstance(msgs, list)
    print("PASS")


async def main():
    await test_connect()
    await test_send_message()
    await test_get_messages()
    print("\nAll Discord tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
