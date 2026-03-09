"""Test scaffold for HomeAssistantConnector.

Pure httpx REST — uses the HA Long-Lived Access Token.
HA must be running (localhost:8123 by default).

Token from devices-mcp/config.yaml (security.integrations.homeassistant.access_token).

Run: python tests/connectors/test_homeassistant.py
"""

import asyncio
import logging
import os
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

HA_CONFIG = {
    "url": os.getenv("HA_URL", "http://localhost:8123"),
    "access_token": os.getenv(
        "HA_TOKEN",
        # token from devices-mcp config.yaml — replace if rotated
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        ".eyJpc3MiOiJmZjZhNzU4NTE5ODk0OWRhYTNlNWQzNzcxYjE4MzA5NCIsImlhdCI6MTc2NDM3NDYxMiwiZXhwIjoyMDc5NzM0NjEyfQ"
        ".sbpnoqFypKnt7hYB-FHHrFxVVTrekacJvYcXGF1nqnY",
    ),
}


async def test_connect():
    print("\n=== test_connect ===")
    from robofang.core.connectors import HomeAssistantConnector

    conn = HomeAssistantConnector("ha", HA_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: HA not reachable — is it running?")


async def test_get_messages():
    print("\n=== test_get_messages (10 most recently changed entities) ===")
    from robofang.core.connectors import HomeAssistantConnector

    conn = HomeAssistantConnector("ha", HA_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    entities = await conn.get_messages(limit=10)
    for e in entities:
        name = e["attributes"].get("friendly_name", e["entity_id"])
        print(f"  {e['entity_id']:40s} {e['state']:15s} ({name})")
    await conn.disconnect()
    assert isinstance(entities, list)
    print(f"PASS — {len(entities)} entities returned")


async def test_light_toggle():
    print("\n=== test_send light.toggle ===")
    from robofang.core.connectors import HomeAssistantConnector

    conn = HomeAssistantConnector("ha", HA_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    # Get first light entity
    entities = await conn.get_messages(limit=50)
    lights = [e for e in entities if e["entity_id"].startswith("light.")]
    if not lights:
        print("SKIP: no light entities found")
        await conn.disconnect()
        return
    target_entity = lights[0]["entity_id"]
    print(f"  Toggling {target_entity}")
    ok = await conn.send_message("light.toggle", target_entity)
    print(f"  light.toggle -> {ok}")
    await asyncio.sleep(2)
    ok2 = await conn.send_message("light.toggle", target_entity)
    print(f"  light.toggle back -> {ok2}")
    await conn.disconnect()
    print("PASS" if ok else "WARN")


async def test_switch_control():
    print("\n=== test_send switch.turn_on / turn_off ===")
    from robofang.core.connectors import HomeAssistantConnector

    conn = HomeAssistantConnector("ha", HA_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    entities = await conn.get_messages(limit=100)
    switches = [e for e in entities if e["entity_id"].startswith("switch.")]
    if not switches:
        print("SKIP: no switch entities found")
        await conn.disconnect()
        return
    target = switches[0]["entity_id"]
    print(f"  Testing switch: {target}")
    ok_on = await conn.send_message("switch.turn_on", target)
    print(f"  turn_on -> {ok_on}")
    await asyncio.sleep(1)
    ok_off = await conn.send_message("switch.turn_off", target)
    print(f"  turn_off -> {ok_off}")
    await conn.disconnect()
    print("PASS" if ok_on and ok_off else "WARN")


async def main():
    await test_connect()
    await test_get_messages()
    await test_light_toggle()
    await test_switch_control()
    print("\nAll Home Assistant tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
