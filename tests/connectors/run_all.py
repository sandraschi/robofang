"""Run all connector tests sequentially.

Usage:
  cd D:\\dev\repos\robofang
  python tests/connectors/run_all.py

Each test handles its own SKIP logic when credentials/hardware are absent.

Required env vars (set what you have):
  MOLTBOOK_API_KEY
  EMAIL_USER, EMAIL_PASSWORD, EMAIL_SMTP_HOST, EMAIL_IMAP_HOST
  DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID
  PLEX_TOKEN  (optionally PLEX_URL if not localhost)
  CALIBRE_LIBRARY  (path to Calibre library folder)
  HA_URL, HA_TOKEN  (or uses hardcoded localhost + token from devices-mcp)

Tapo, Hue, Ring use hardcoded LAN config matching devices-mcp/config.yaml.
"""

import asyncio
import importlib
import sys
import traceback

TESTS = [
    # no-hardware-needed first
    "tests.connectors.test_moltbook",
    "tests.connectors.test_email",
    "tests.connectors.test_discord",
    "tests.connectors.test_calibre",
    # LAN hardware
    "tests.connectors.test_homeassistant",
    "tests.connectors.test_tapo",
    "tests.connectors.test_hue",
    "tests.connectors.test_shelly",
    "tests.connectors.test_ring",
    # local server
    "tests.connectors.test_plex",
]


async def run_all():
    results = {}
    for mod_path in TESTS:
        name = mod_path.split(".")[-1]
        print(f"\n{'=' * 60}")
        print(f"RUNNING: {name}")
        print("=" * 60)
        try:
            mod = importlib.import_module(mod_path)
            await mod.main()
            results[name] = "OK"
        except Exception as e:
            print(f"ERROR in {name}: {e}")
            traceback.print_exc()
            results[name] = f"ERROR: {e}"

    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print("=" * 60)
    ok = sum(1 for s in results.values() if s == "OK")
    for name, status in results.items():
        icon = "OK  " if status == "OK" else "FAIL"
        print(f"  [{icon}] {name}: {status}")
    print(f"\n{ok}/{len(results)} passed")


if __name__ == "__main__":
    sys.path.insert(0, "src")
    sys.path.insert(0, ".")
    asyncio.run(run_all())
