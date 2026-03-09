"""Test scaffold for CalibreConnector.

Uses calibredb subprocess — Calibre must be installed.
No extra Python deps.

Run: python tests/connectors/test_calibre.py
"""

import asyncio
import logging
import os
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# Adjust library path to your Calibre library location
CALIBRE_CONFIG = {
    "calibredb_path": os.getenv("CALIBREDB_PATH", "calibredb"),
    "library_path": os.getenv("CALIBRE_LIBRARY", ""),  # e.g. D:\Media\Calibre Library
}


async def test_connect():
    print("\n=== test_connect (calibredb --version) ===")
    from robofang.core.connectors import CalibreConnector

    conn = CalibreConnector("calibre", CALIBRE_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}")
    await conn.disconnect()
    print(
        "PASS"
        if ok
        else "WARN: calibredb not found — is Calibre installed and on PATH?"
    )


async def test_get_messages():
    print("\n=== test_get_messages (10 most recent books) ===")
    from robofang.core.connectors import CalibreConnector

    conn = CalibreConnector("calibre", CALIBRE_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    books = await conn.get_messages(limit=10)
    for b in books:
        title = b.get("title", "?") if isinstance(b, dict) else b
        authors = b.get("authors", "") if isinstance(b, dict) else ""
        print(f"  {b.get('id', ''):>6} | {str(title)[:50]:50s} | {str(authors)[:30]}")
    await conn.disconnect()
    assert isinstance(books, list)
    print(f"PASS — {len(books)} books returned")


async def test_search():
    print("\n=== search for 'python' ===")
    from robofang.core.connectors import CalibreConnector

    conn = CalibreConnector("calibre", CALIBRE_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    import asyncio as _a

    loop = _a.get_event_loop()
    import subprocess
    import json as _j

    def _search():
        r = subprocess.run(
            conn._cmd(
                "list",
                "--search",
                "python",
                "--fields",
                "id,title,authors",
                "--limit",
                "5",
                "--for-machine",
            ),
            capture_output=True,
            text=True,
            timeout=30,
        )
        if r.returncode == 0:
            try:
                return _j.loads(r.stdout)
            except Exception:
                return []
        return []

    results = await loop.run_in_executor(None, _search)
    for b in results:
        print(f"  {b.get('id'):>6} | {b.get('title', '')[:50]}")
    await conn.disconnect()
    print(f"PASS — {len(results)} results for 'python'")


async def main():
    await test_connect()
    await test_get_messages()
    await test_search()
    print("\nAll Calibre tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
