"""Test scaffold for PlexConnector.

Uses plexapi library. Plex server must be running.
Set PLEX_URL and PLEX_TOKEN env vars, or edit config below.

Run: python tests/connectors/test_plex.py
"""

import asyncio
import logging
import os
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

PLEX_CONFIG = {
    "url": os.getenv("PLEX_URL", "http://localhost:32400"),
    "token": os.getenv("PLEX_TOKEN", ""),  # X-Plex-Token from your Plex account
}


def _skip():
    if not PLEX_CONFIG["token"]:
        print("SKIP: set PLEX_TOKEN env var (find it in your Plex account settings)")
        return True
    return False


async def test_connect():
    print("\n=== test_connect ===")
    if _skip():
        return
    from robofang.core.connectors import PlexConnector

    conn = PlexConnector("plex", PLEX_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}")
    if conn._server:
        print(f"  Server: {conn._server.friendlyName} ({conn._server.version})")
    await conn.disconnect()
    print("PASS" if ok else "WARN: Plex not reachable")


async def test_get_messages():
    print("\n=== test_get_messages (recently added) ===")
    if _skip():
        return
    from robofang.core.connectors import PlexConnector

    conn = PlexConnector("plex", PLEX_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    items = await conn.get_messages(limit=10)
    for item in items:
        print(
            f"  [{item['type']:8s}] {item['title']} ({item.get('year', '')}) — {item['section']}"
        )
    await conn.disconnect()
    assert isinstance(items, list)
    print(f"PASS — {len(items)} items")


async def test_library_sections():
    print("\n=== library sections ===")
    if _skip():
        return
    from robofang.core.connectors import PlexConnector

    conn = PlexConnector("plex", PLEX_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    loop = asyncio.get_event_loop()
    sections = await loop.run_in_executor(None, lambda: conn._server.library.sections())
    for s in sections:
        print(f"  [{s.type:8s}] {s.title} — {s.totalSize} items")
    await conn.disconnect()
    print("PASS")


async def test_active_sessions():
    print("\n=== active sessions (what's playing) ===")
    if _skip():
        return
    from robofang.core.connectors import PlexConnector

    conn = PlexConnector("plex", PLEX_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    loop = asyncio.get_event_loop()
    sessions = await loop.run_in_executor(None, lambda: conn._server.sessions())
    if sessions:
        for s in sessions:
            print(f"  Playing: {s.title} on {s.player.title} ({s.player.state})")
    else:
        print("  No active sessions")
    await conn.disconnect()
    print("PASS")


async def main():
    await test_connect()
    await test_get_messages()
    await test_library_sections()
    await test_active_sessions()
    print("\nAll Plex tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
