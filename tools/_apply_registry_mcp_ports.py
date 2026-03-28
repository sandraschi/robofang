"""Set MCP_PORT env default in transport.py to fleet registry backend ports.

10700 is **not** a generic default: WEBAPP_PORTS.md assigns it to virtualization-mcp.
Every repo here must use its own backend (markdown table or webapp-registry.json
frontend port + 1 when pairs are adjacent). Do not add new "10700" placeholders.
"""

from __future__ import annotations

import pathlib
import re

REPOS = pathlib.Path(r"D:\Dev\repos")

# Backend / MCP HTTP defaults (mcp-central-docs/operations/WEBAPP_PORTS.md)
REGISTRY_PORT: dict[str, str] = {
    "advanced-memory-mcp/src/advanced_memory/transport.py": "10704",
    "avatar-mcp/src/avatarmcp/transport.py": "10793",
    "beyondcompare-mcp/src/beyondcompare_mcp/transport.py": "10841",
    "blender-mcp/src/blender_mcp/transport.py": "10849",
    "bookmarks-mcp/src/browser_bookmarks_tools/transport.py": "10803",
    "calibre-mcp/src/calibre_mcp/transport.py": "10720",
    "database-operations-mcp/src/browser_bookmarks_tools/transport.py": "10708",
    "database-operations-mcp/src/database_operations_mcp/transport.py": "10708",
    "davinci-resolve-mcp/src/davinci_resolve_mcp/transport.py": "10843",
    "devices-mcp/src/devices_mcp/transport.py": "10716",
    "email-mcp/src/email_mcp/transport.py": "10813",
    "directmedia-mcp/src/directmedia_mcp/transport.py": "10827",
    "docker-mcp/src/customization/transport.py": "10807",
    "docker-mcp/src/dockermcp/transport.py": "10807",
    "fastsearch-mcp/src/fastsearch_mcp/transport.py": "10845",
    # gtfs: registry JSON had 10897 (magentart-mcp in WEBAPP_PORTS.md). MCP HTTP: gap 10922.
    "gtfs-mcp/src/gtfs_mcp/transport.py": "10922",
    "filesystem-mcp/src/filesystem_mcp/transport.py": "10742",
    "gimp-mcp/src/gimp_mcp/transport.py": "10873",
    "git-github-mcp/src/git_github_mcp/transport.py": "10702",
    "handbrake-mcp/src/handbrake_mcp/transport.py": "10875",
    "home-assistant-mcp/src/home_assistant_mcp/transport.py": "10782",
    "immich-mcp/src/immich_mcp/transport.py": "10839",
    "inkscape-mcp/src/inkscape_mcp/transport.py": "10873",
    "llm-txt-mcp/src/llm_txt_mcp/transport.py": "10837",
    "local-llm-mcp/src/llm_mcp/transport.py": "10833",
    "moltbot-mcp/src/moltbot_mcp/transport.py": "10730",
    "monitoring-mcp/src/monitoring_mcp/transport.py": "10851",
    "multi-backup-mcp/src/multi_backup_mcp/transport.py": "10799",
    "nest-protect-mcp/src/nest_protect_mcp/transport.py": "10753",
    "notion-mcp/notion_mcp/transport.py": "10811",
    "netatmo-weather-mcp/src/netatmo_weather_mcp/transport.py": "10823",
    "notepadpp-mcp/src/notepadpp_mcp/transport.py": "10815",
    "obs-mcp/src/obs_studio_mcp/transport.py": "10819",
    # observability-mcp: webapp-registry frontend 10901 → backend +1 (not in markdown table).
    "observability-mcp/src/observability_mcp/transport.py": "10902",
    "obsidian-mcp/src/obsidian_mcp/transport.py": "10903",
    "onenote-mcp/src/onenote_mcp/transport.py": "10905",
    "openclaw-molt-mcp/src/openclaw_molt_mcp/transport.py": "10765",
    "osc-mcp/src/oscmcp/transport.py": "10767",
    "ocr-mcp/src/ocr_mcp/transport.py": "10859",
    "pinokio-mcp/src/pinokio_mcp/transport.py": "10908",
    "plex-mcp/src/plex_mcp/transport.py": "10740",
    "pywinauto-mcp/src/pywinauto_mcp/transport.py": "10789",
    "readly-mcp/src/readly_mcp/transport.py": "10912",
    "repomix-mcp/src/repomix_mcp/transport.py": "10914",
    "resolume-mcp/src/resolume_mcp/transport.py": "10770",
    "resonite-mcp/src/resonite_mcp/transport.py": "10714",
    "reversing-mcp/src/reversing_mcp/transport.py": "10750",
    "robotics-mcp/src/robotics_mcp/transport.py": "10706",
    "rustdesk-mcp/src/rustdesk_mcp/transport.py": "10805",
    "sdr-mcp/src/sdr_mcp/transport.py": "10916",
    "songgeneration-mcp/src/songgeneration_mcp/transport.py": "10885",
    "suno-mcp/src/suno_mcp/transport.py": "10883",
    "system-admin-mcp/src/system_admin_mcp/transport.py": "10861",
    "tailscale-mcp/src/tailscalemcp/transport.py": "10821",
    "unity3d-mcp/src/unity3d_mcp/transport.py": "10831",
    "vienna-live-mcp/src/vienna_live_mcp/transport.py": "10879",
    "virtualdj-mcp/src/virtualdj_mcp/transport.py": "10877",
    "vrchat-mcp/src/vrchat_mcp/transport.py": "10712",
    "vroidstudio-mcp/src/vroidstudio_mcp/transport.py": "10881",
    "web-development-mcp/src/web_development_mcp/transport.py": "10853",
    "windows-operations-mcp/src/windows_operations_mcp/transport.py": "10748",
    "winrar-mcp/src/winrarmcp/transport.py": "10762",
    "qbt-mcp/src/qbtmcp/transport.py": "10910",
    "alexa-mcp/src/alexa_mcp/transport.py": "10801",
}


def sync_port_in_text(text: str, port: str) -> str:
    text = re.sub(
        r'int\(os\.getenv\(ENV_PORT, "[0-9]+"\)\)',
        f'int(os.getenv(ENV_PORT, "{port}"))',
        text,
        count=1,
    )
    text = re.sub(
        r'(ENV_PORT = "MCP_PORT"  # default: )[0-9]+',
        rf"\g<1>{port}",
        text,
        count=1,
    )
    text = re.sub(
        r"(  \{ENV_PORT\}         Port number \(default: )[0-9]+(\))",
        rf"\g<1>{port}\g<2>",
        text,
        count=1,
    )
    text = re.sub(
        r"(MCP_PORT: Port for HTTP/SSE\. Default: )[0-9]+( \(fleet 10700\+[^\n]*)",
        rf"\g<1>{port}\g<2>",
        text,
        count=1,
    )
    text = re.sub(
        r"(\$\{ENV_PORT\} or )[0-9]+(\))",
        rf"\g<1>{port}\g<2>",
        text,
        count=1,
    )
    text = re.sub(
        r"(--http --port )[0-9]+",
        rf"\g<1>{port}",
        text,
    )
    text = re.sub(
        r"(MCP_TRANSPORT=http MCP_PORT=)[0-9]+( python)",
        rf"\g<1>{port}\g<2>",
        text,
    )
    return text


def main() -> None:
    for rel, port in sorted(REGISTRY_PORT.items()):
        path = REPOS / rel
        if not path.is_file():
            continue
        old = path.read_text(encoding="utf-8")
        new = sync_port_in_text(old, port)
        if new != old:
            path.write_text(new, encoding="utf-8", newline="\n")
            print(path)


if __name__ == "__main__":
    main()
