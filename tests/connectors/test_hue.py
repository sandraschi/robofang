"""Test scaffold for HueConnector (phue).

Run: python tests/connectors/test_hue.py
Philips Hue bridge must be on LAN at 192.168.0.236.
"""

import asyncio
import logging
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

HUE_CONFIG = {
    "bridge_ip": "192.168.0.236",
    "username": "J1A3OQ1OMzJDtidSNQWWGmCBuAxZC3lxEjT9qnVc",
}


async def test_connect():
    print("\n=== test_connect ===")
    from robofang.core.connectors import HueConnector

    conn = HueConnector("hue", HUE_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: bridge not reachable")


async def test_get_messages():
    print("\n=== test_get_messages (light states) ===")
    from robofang.core.connectors import HueConnector

    conn = HueConnector("hue", HUE_CONFIG)
    await conn.connect()
    lights = await conn.get_messages(limit=10)
    for l in lights:
        print(f"  {l}")
    await conn.disconnect()
    assert isinstance(lights, list)
    print("PASS")


async def test_send_on_off():
    print("\n=== test_send on/off cycle ===")
    from robofang.core.connectors import HueConnector

    conn = HueConnector("hue", HUE_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP: bridge not reachable")
        return

    # Get first light name
    lights = await conn.get_messages(limit=1)
    if not lights:
        print("SKIP: no lights found")
        await conn.disconnect()
        return

    name = lights[0]["name"]
    print(f"Testing with light: '{name}'")
    ok_on = await conn.send_message(name, "on")
    print(f"  on -> {ok_on}")
    await asyncio.sleep(1)
    ok_off = await conn.send_message(name, "off")
    print(f"  off -> {ok_off}")
    await conn.disconnect()
    print("PASS" if ok_on and ok_off else "WARN")


async def test_send_color():
    print("\n=== test_send color:warm ===")
    from robofang.core.connectors import HueConnector

    conn = HueConnector("hue", HUE_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    lights = await conn.get_messages(limit=1)
    if not lights:
        print("SKIP")
        await conn.disconnect()
        return
    name = lights[0]["name"]
    ok = await conn.send_message(name, "color:warm")
    print(f"color:warm on '{name}' -> {ok}")
    await conn.disconnect()
    print("PASS" if ok else "WARN")


async def main():
    await test_connect()
    await test_get_messages()
    await test_send_on_off()
    await test_send_color()
    print("\nAll Hue tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
