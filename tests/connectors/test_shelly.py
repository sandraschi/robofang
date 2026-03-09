"""Test scaffold for ShellyConnector.

Pure httpx REST — no extra deps beyond httpx (already in core).
Shelly devices must be on LAN.

Run: python tests/connectors/test_shelly.py
"""

import asyncio
import logging
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# Adjust to your Shelly devices — Gen1 and Gen2 mixed example
SHELLY_CONFIG = {
    "devices": [
        # Add your Shelly device IPs here:
        # {"host": "192.168.0.50", "alias": "shelly_hall",   "gen": 1},
        # {"host": "192.168.0.51", "alias": "shelly_desk",   "gen": 2},
    ]
}


async def test_connect():
    print("\n=== test_connect ===")
    if not SHELLY_CONFIG["devices"]:
        print("SKIP: no devices configured in SHELLY_CONFIG")
        return
    from robofang.core.connectors import ShellyConnector

    conn = ShellyConnector("shelly", SHELLY_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, online: {list(conn._online.keys())}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: no Shelly devices reachable")


async def test_get_messages():
    print("\n=== test_get_messages (device state) ===")
    if not SHELLY_CONFIG["devices"]:
        print("SKIP")
        return
    from robofang.core.connectors import ShellyConnector

    conn = ShellyConnector("shelly", SHELLY_CONFIG)
    await conn.connect()
    readings = await conn.get_messages()
    for r in readings:
        print(f"  {r}")
    await conn.disconnect()
    assert isinstance(readings, list)
    print("PASS")


async def test_send_on_off():
    print("\n=== test_send on/off cycle ===")
    if not SHELLY_CONFIG["devices"]:
        print("SKIP")
        return
    from robofang.core.connectors import ShellyConnector

    conn = ShellyConnector("shelly", SHELLY_CONFIG)
    await conn.connect()
    if not conn._online:
        print("SKIP: no devices online")
        await conn.disconnect()
        return
    alias = list(conn._online.keys())[0]
    ok_on = await conn.send_message(alias, "on")
    print(f"  {alias} on -> {ok_on}")
    await asyncio.sleep(1)
    ok_off = await conn.send_message(alias, "off")
    print(f"  {alias} off -> {ok_off}")
    await conn.disconnect()
    print("PASS" if ok_on and ok_off else "WARN")


async def main():
    await test_connect()
    await test_get_messages()
    await test_send_on_off()
    print("\nAll Shelly tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
