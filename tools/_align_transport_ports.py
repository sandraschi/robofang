"""Align MCP_PORT env default in transport.py copies (fleet 10700+ per WEBAPP_PORTS.md).

10700 is virtualization-mcp's assigned port - never use as a blanket default for other repos.
Unlisted repos get FLEET_UNALLOCATED_GAP (10855) so collisions with 10700 are obvious; prefer
adding an explicit row to WEBAPP_PORTS.md and to _apply_registry_mcp_ports.REGISTRY_PORT.
"""

from __future__ import annotations

import pathlib

REPOS = pathlib.Path(r"D:\Dev\repos")
# Per-repo defaults when MCP_PORT unset (see mcp-central-docs/operations/WEBAPP_PORTS.md)
SPECIAL_DEFAULT_PORT: dict[str, str] = {
    "plex-mcp/src/plex_mcp/transport.py": "10740",
    "devices-mcp/src/devices_mcp/transport.py": "10716",
}
# Gap in WEBAPP_PORTS 10852-10856 block (not assigned to a service in the markdown table).
FLEET_UNALLOCATED_GAP = "10855"

SKIP_PARTS = frozenset(
    {
        "junk",
        ".git",
        "node_modules",
        ".venv",
        "venv",
        "test_venv",
        "__pycache__",
        ".egg-info",
        "dist",
        ".tox",
    }
)


def port_for(path: pathlib.Path) -> str:
    rel = path.relative_to(REPOS).as_posix()
    return SPECIAL_DEFAULT_PORT.get(rel, FLEET_UNALLOCATED_GAP)


def patch_file(path: pathlib.Path) -> bool:
    text = path.read_text(encoding="utf-8")
    port = port_for(path)
    orig = text
    text = text.replace(
        'int(os.getenv(ENV_PORT, "8000"))',
        f'int(os.getenv(ENV_PORT, "{port}"))',
    )
    text = text.replace(
        'ENV_PORT = "MCP_PORT"  # default: 8000',
        f'ENV_PORT = "MCP_PORT"  # default: {port}',
    )
    text = text.replace(
        "  {ENV_PORT}         Port number (default: 8000)",
        f"  {{ENV_PORT}}         Port number (default: {port})",
    )
    text = text.replace(
        'help=f"Port to listen on (default: ${ENV_PORT} or 8000)"',
        f'help=f"Port to listen on (default: ${{ENV_PORT}} or {port})"',
    )
    # Docstring line (various phrasings)
    text = text.replace(
        "MCP_PORT: Port for HTTP/SSE. Default: 8000",
        f"MCP_PORT: Port for HTTP/SSE. Default: {port} (fleet 10700+; set MCP_PORT to override)",
    )
    if text != orig:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> None:
    import os

    changed = 0
    for child in sorted(REPOS.iterdir()):
        if not child.is_dir() or child.name in SKIP_PARTS:
            continue
        for dirpath, dirnames, filenames in os.walk(child, topdown=True):
            dirnames[:] = [d for d in dirnames if d not in SKIP_PARTS]
            if "transport.py" not in filenames:
                continue
            p = pathlib.Path(dirpath) / "transport.py"
            try:
                rel = p.relative_to(REPOS)
            except ValueError:
                continue
            if rel.parts[0] == "mcp-central-docs":
                continue
            body = p.read_text(encoding="utf-8")
            if 'ENV_PORT = "MCP_PORT"' not in body:
                continue
            if patch_file(p):
                changed += 1
                print(p)
    print(f"updated {changed} files")


if __name__ == "__main__":
    main()
