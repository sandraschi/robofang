"""Test scaffold for MCPBridgeConnector.

Tests the generic bridge against any of the 6 MCP sidecars.
By default runs against plex-mcp on port 8101. Requires plex-mcp
to be installed and reachable (or auto_start will launch it).

Run: python tests/connectors/test_mcp_bridge.py [plex|calibre|immich|blender|gimp|inkscape]
"""

import asyncio
import json
import logging
import pathlib
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# Load sidecar configs

_config_path = pathlib.Path("configs/mcp_sidecars.json")

PYTHON = r"C:\Users\sandr\AppData\Local\Programs\Python\Python313\python.exe"

# Minimal inline fallback if file doesn't exist yet
FALLBACK_CONFIGS = {
    "plex": {
        "name": "plex-mcp",
        "url": "http://127.0.0.1:8101/mcp",
        "auto_start": False,  # don't auto-start in test unless config confirms it
    },
    "calibre": {
        "name": "calibre-mcp",
        "url": "http://127.0.0.1:8102/mcp",
        "auto_start": False,
    },
    "immich": {
        "name": "immich-mcp",
        "url": "http://127.0.0.1:8103/mcp",
        "auto_start": False,
    },
    "blender": {
        "name": "blender-mcp",
        "url": "http://127.0.0.1:8110/mcp",
        "auto_start": False,
    },
    "gimp": {
        "name": "gimp-mcp",
        "url": "http://127.0.0.1:8111/mcp",
        "auto_start": False,
    },
    "inkscape": {
        "name": "inkscape-mcp",
        "url": "http://127.0.0.1:8112/mcp",
        "auto_start": False,
    },
}


def load_config(sidecar: str) -> dict:
    if _config_path.exists():
        with open(_config_path) as f:
            data = json.load(f)
        if sidecar in data:
            return data[sidecar]
    return FALLBACK_CONFIGS.get(sidecar, FALLBACK_CONFIGS["plex"])


async def test_connect(sidecar: str = "plex"):
    print(f"\n=== test_connect [{sidecar}] ===")
    from robofang.core.connectors import MCPBridgeConnector

    cfg = load_config(sidecar)
    conn = MCPBridgeConnector(sidecar, cfg)
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}, url={cfg['url']}")
    await conn.disconnect()
    if not ok:
        print(f"WARN: {sidecar} sidecar not reachable.")
        print(f"  Start it manually: cd {cfg.get('start_cwd', 'D:/Dev/repos/' + sidecar)}")
        print(
            f"  Then: MCP_TRANSPORT=http MCP_PORT={cfg['url'].split(':')[-1].split('/')[0]} python -m <module> --http"
        )
    return ok


async def test_tools_list(sidecar: str = "plex"):
    print(f"\n=== test_tools_list [{sidecar}] ===")
    from robofang.core.connectors import MCPBridgeConnector

    cfg = load_config(sidecar)
    conn = MCPBridgeConnector(sidecar, cfg)
    ok = await conn.connect()
    if not ok:
        print("SKIP: not connected")
        return []
    tools = await conn.get_messages(limit=20)
    print(f"  {len(tools)} tools exposed:")
    for t in tools:
        print(f"    {t['name']:40s} {t['description'][:80]}")
    await conn.disconnect()
    assert isinstance(tools, list)
    print("PASS")
    return [t["name"] for t in tools]


async def test_call_tool(sidecar: str = "plex", tool: str | None = None, args: dict | None = None):
    print(f"\n=== test_call_tool [{sidecar}] tool={tool} ===")
    from robofang.core.connectors import MCPBridgeConnector

    cfg = load_config(sidecar)
    conn = MCPBridgeConnector(sidecar, cfg)
    ok = await conn.connect()
    if not ok:
        print("SKIP: not connected")
        return
    result = await conn.call_tool(tool, args or {})
    if result is None:
        print("WARN: call_tool returned None — tool may not exist or errored")
    else:
        if isinstance(result, dict):
            print(f"  Result keys: {list(result.keys())}")
        elif isinstance(result, list):
            print(f"  Result: {len(result)} items")
        else:
            preview = str(result)[:300]
            print(f"  Result: {preview}")
    await conn.disconnect()
    print("PASS")


# ── Sidecar-specific smoke tests ──────────────────────────────────────────────

SIDECAR_SMOKE_CALLS = {
    # tool name, arguments
    "plex": ("plex_library", {"action": "list_sections"}),
    "calibre": ("calibre_search", {"query": "python", "limit": 5}),
    "immich": ("search_photos", {"query": "dog", "limit": 5}),
    "blender": ("blender_status", {}),
    "gimp": ("gimp_status", {}),
    "inkscape": ("inkscape_info", {}),
}


async def run_sidecar(sidecar: str):
    connected = await test_connect(sidecar)
    if not connected:
        print(f"\nCannot run further tests for {sidecar} — not reachable.")
        return

    tool_names = await test_tools_list(sidecar)

    if sidecar in SIDECAR_SMOKE_CALLS:
        tool, args = SIDECAR_SMOKE_CALLS[sidecar]
        if tool in tool_names:
            await test_call_tool(sidecar, tool, args)
        else:
            # Try first available tool with empty args
            if tool_names:
                print(f"\nSmoke tool '{tool}' not found — trying '{tool_names[0]}' instead")
                await test_call_tool(sidecar, tool_names[0], {})


async def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "plex"
    valid = list(FALLBACK_CONFIGS.keys())
    if target == "all":
        for s in valid:
            await run_sidecar(s)
    elif target in valid:
        await run_sidecar(target)
    else:
        print(f"Unknown sidecar '{target}'. Valid: {valid} or 'all'")
        sys.exit(1)
    print(f"\nMCPBridgeConnector tests complete for: {target}")


if __name__ == "__main__":
    asyncio.run(main())
