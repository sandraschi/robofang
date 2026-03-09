"""Test scaffold for TapoConnector (python-kasa).

Run: python tests/connectors/test_tapo.py
Uses real IPs from devices-mcp config.yaml — Tapo devices must be on LAN.
"""

import asyncio
import logging
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# Real config from devices-mcp/config.yaml
TAPO_CONFIG = {
    "username": "sandraschipal@hotmail.com",
    "password": "Sec1060ta#",
    "devices": [
        {
            "host": "192.168.0.17",
            "alias": "tapo_aircon",
            "device_id": "tapo_p115_aircon",
            "readonly": False,
        },
        {
            "host": "192.168.0.138",
            "alias": "tapo_kitchen",
            "device_id": "tapo_p115_kitchen",
            "readonly": False,
        },
        {
            "host": "192.168.0.38",
            "alias": "tapo_server",
            "device_id": "tapo_p115_server",
            "readonly": True,
        },
    ],
}


async def test_connect():
    print("\n=== test_connect ===")
    from robofang.core.connectors import TapoConnector

    conn = TapoConnector("tapo", TAPO_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, devices online: {list(conn._devices.keys())}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: no devices reachable (check LAN / credentials)")


async def test_get_messages():
    print("\n=== test_get_messages (device state) ===")
    from robofang.core.connectors import TapoConnector

    conn = TapoConnector("tapo", TAPO_CONFIG)
    await conn.connect()
    readings = await conn.get_messages(limit=10)
    for r in readings:
        print(f"  {r}")
    await conn.disconnect()
    assert isinstance(readings, list)
    print("PASS")


async def test_send_readonly_rejected():
    print("\n=== test_send_readonly_rejected ===")
    from robofang.core.connectors import TapoConnector

    conn = TapoConnector("tapo", TAPO_CONFIG)
    await conn.connect()
    # Server plug is readonly — command must be rejected
    ok = await conn.send_message("tapo_server", "off")
    assert ok is False, "readonly device should reject commands"
    print(f"readonly rejection -> {not ok} (expected False) PASS")
    await conn.disconnect()


async def test_send_toggle():
    print("\n=== test_send_toggle (kitchen — non-readonly) ===")
    from robofang.core.connectors import TapoConnector

    conn = TapoConnector("tapo", TAPO_CONFIG)
    await conn.connect()
    if "tapo_kitchen" not in conn._devices:
        print("SKIP: tapo_kitchen not reachable")
        await conn.disconnect()
        return
    ok = await conn.send_message("tapo_kitchen", "toggle")
    print(f"toggle tapo_kitchen -> {ok}")
    await asyncio.sleep(1)
    # toggle back
    ok2 = await conn.send_message("tapo_kitchen", "toggle")
    print(f"toggle back -> {ok2}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: toggle failed")


async def main():
    await test_connect()
    await test_get_messages()
    await test_send_readonly_rejected()
    await test_send_toggle()
    print("\nAll Tapo tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
