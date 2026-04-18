---
title: "Webapp Port Reservoir"
category: reference
status: active
audience: mcp-dev
skill_candidate: false
related:
  - operations/SOTA_MASTER_INVENTORY.md
  - operations/webapp-registry.json
last_updated: 2026-02-10
---

# Webapp Port Reservoir

**Version**: 1.0  
**Last Updated**: 2025-02-10  
**Status**: MANDATORY

---

## Purpose

All MCP server webapps and dashboards MUST use ports from the reserved range **10700-10800**. This eliminates port conflicts with common dev defaults (3000, 5000, 5173, 8000, 8080) and provides a single predictable range for the entire ecosystem.

## Port Range

- **Reserved**: 10700-10800 (100 ports)
- **Spacing**: Use even-numbered ports with gaps (10700, 10702, 10704...) to absorb "port hopper" drift
- **No collision** with IANA well-known (0-1023) or common dev ports
- **Adjacency Rule (MANDATORY)**: Frontend and Backend ports for a single project MUST be kept together (e.g., 10792/10793). Do NOT "hop" into unused lower gaps if it breaks project adjacency.

## FORBIDDEN Ports

**NEVER** use these for new webapps:

- 3000 (Create React App, many Node dev servers)
- 5000 (Flask default, many Python dev servers)
- 5173 (Vite default)
- 8000, 8080 (common API/defaults)
- 5174, 5175 (Vite fallbacks)
- Any port below 1024 (privileged)

## Port Allocation Registry

| Port | Repo | Service |
|------|------|---------| 
| 10700 | virtualization-mcp | Web dashboard |
| 10702 | git-github-mcp | Git GitHub Hub |
| 10704 | advanced-memory-mcp | Webapp |
| 10705 | advanced-memory-mcp | Bridge server |
| 10706 | robotics-mcp | Web dashboard |
| 10708 | database-operations-mcp | Web dashboard |
| 10710 | unity3d-mcp | Web dashboard |
| 10712 | vrchat-mcp | Web dashboard |
| 10714 | resonite-mcp | Web dashboard |
| 10716 | devices-mcp | Web dashboard |
| 10718 | meta_mcp | Backend |
| 10719 | meta_mcp | Frontend |
| 10720 | calibre-mcp | Backend |
| 10721 | calibre-mcp | Frontend |
| 10722 | mywienerlinien | Frontend |
| 10724 | mcp-studio | Backend |
| 10725 | mcp-studio | Frontend |
| 10728 | ring-mcp | Web dashboard |
| 10730 | moltbot-mcp | Webapp |
| 10732 | advanced-memory-mcp | MCP SSE transport |
| 10733 | advanced-memory-mcp | Startup service |
| 10734 | myai/calibre_plus | Frontend |
| 10735 | advanced-memory-mcp | Auto-start service |
| 10736 | myai/calibre_plus | Backend |
| 10738 | dark-app-factory | Web dashboard |
| 10739 | dark-app-factory | MCP streamable HTTP (`mcp-server/`, path `/mcp`) |
| 10740 | plex-mcp | Webapp backend |
| 10741 | plex-mcp | Webapp frontend |
| 10742 | filesystem-mcp | Backend |
| 10743 | filesystem-mcp | Frontend |
| 10744 | autohotkey-test | Scriptlet COMBridge (AHK dashboard) |
| 10746 | autohotkey-mcp | MCP server (backend) |
| 10747 | autohotkey-mcp | React SPA (frontend) |
| 10748 | windows-operations-mcp | Backend |
| 10749 | windows-operations-mcp | Frontend |
| 10750 | reversing-mcp | Backend (API) |
| 10751 | reversing-mcp | Frontend |
| 10752 | nest-protect-mcp | Frontend |
| 10753 | nest-protect-mcp | Backend |
| 10760 | robofang-mcp | Web dashboard frontend |
| 10761 | robofang-mcp | Web dashboard backend |
| 10762 | winrar-mcp | Backend |
| 10763 | winrar-mcp | Frontend |
| 10764 | openclaw-molt-mcp | Frontend |
| 10765 | openclaw-molt-mcp | Backend |
| 10766 | osc-mcp | Web dashboard frontend |
| 10767 | osc-mcp | Web dashboard backend |
| 10772 | gimp-mcp | Frontend |
| 10773 | gimp-mcp | Backend |
| 10782 | home-assistant-mcp | MCP HTTP |
| 10788 | pywinauto-mcp | Web dashboard frontend |
| 10789 | pywinauto-mcp | Web dashboard backend |
| 10792 | avatar-mcp | Web dashboard frontend |
| 10793 | avatar-mcp | Web dashboard backend (API) |
| 10794 | mcp-central-docs | Fleet Dashboard |
| 10795 | mcp-central-docs | Fleet Frontend |
| 10796 | reaper-mcp | Web dashboard frontend |
| 10797 | reaper-mcp | Web dashboard backend |
| 10798 | multi-backup-mcp | Frontend |
| 10799 | multi-backup-mcp | Backend |
| 10800 | alexa-mcp | Web dashboard frontend |
| 10801 | alexa-mcp | Web dashboard backend |
| 10802 | bookmarks-mcp | Web dashboard frontend |
| 10803 | bookmarks-mcp | Web dashboard backend |
| 10804 | rustdesk-mcp | Web dashboard frontend |
| 10805 | rustdesk-mcp | Web dashboard backend |
| 10806 | docker-mcp | Web dashboard frontend |
| 10807 | docker-mcp | Web dashboard backend |
| 10810 | notion-mcp | Web dashboard frontend |
| 10811 | notion-mcp | Web dashboard backend |
| 10812 | email-mcp | Web dashboard frontend |
| 10813 | email-mcp | Web dashboard backend |
| 10814 | notepadpp-mcp | Web dashboard frontend |
| 10815 | notepadpp-mcp | Web dashboard backend |
| 10818 | obs-mcp | Web dashboard frontend |
| 10819 | obs-mcp | Web dashboard backend |
| 10820 | tailscale-mcp | Web dashboard frontend |
| 10821 | tailscale-mcp | Web dashboard backend |
| 10822 | netatmo-weather-mcp | Web dashboard frontend |
| 10823 | netatmo-weather-mcp | Web dashboard backend |
| 10826 | directmedia-mcp | Web dashboard frontend |
| 10827 | directmedia-mcp | Web dashboard backend |
| 10828 | nest-protect-mcp | Web dashboard frontend |
| 10829 | nest-protect-mcp | Web dashboard backend |
| 10830 | unity3d-mcp | Web dashboard frontend |
| 10831 | unity3d-mcp | Web dashboard backend |
| 10832 | local-llm-mcp | Web dashboard frontend |
| 10833 | local-llm-mcp | Web dashboard backend |
| 10834 | home-assistant-mcp | Web dashboard frontend |
| 10835 | home-assistant-mcp | Web dashboard backend |
| 10836 | llm-txt-mcp | Web dashboard frontend |
| 10837 | llm-txt-mcp | Web dashboard backend |
| 10838 | immich-mcp | Web dashboard frontend |
| 10839 | immich-mcp | Web dashboard backend |
| 10840 | beyondcompare-mcp | Web dashboard frontend |
| 10841 | beyondcompare-mcp | Web dashboard backend |
| 10842 | davinci-resolve-mcp | Web dashboard frontend |
| 10843 | davinci-resolve-mcp | Web dashboard backend |
| 10844 | fastsearch-mcp | Web dashboard frontend |
| 10845 | fastsearch-mcp | Web dashboard backend |
| 10848 | blender-mcp | Web dashboard frontend |
| 10849 | blender-mcp | Web dashboard backend |
| 10850 | monitoring-mcp | Web dashboard frontend |
| 10851 | monitoring-mcp | Web dashboard backend |
| 10852 | web-development-mcp | Web dashboard frontend |
| 10853 | web-development-mcp | Web dashboard backend |
| 10854 | paperless-ngx | Web interface |
| 10856 | mcp-federation-hub | Web interface |
| 10857 | mcp-federation-hub | Web dashboard backend |
| 10858 | ocr-mcp | Web dashboard frontend |
| 10859 | ocr-mcp | Web dashboard backend |
| 10860 | system-admin-mcp | Web dashboard frontend |
| 10861 | system-admin-mcp | Web dashboard backend |
| 10862 | sakana-mcp | Web dashboard frontend (Vite) |
| 10863 | sakana-mcp | Web dashboard backend (FastAPI) |
| 10864 | worldlabs-mcp | Web dashboard frontend |
| 10865 | worldlabs-mcp | Web dashboard backend |
| 10870 | robofang | Web dashboard frontend |
| 10871 | robofang | Bridge server |
| 10872 | robofang | Supervisor |
| 10873 | freevibe-at | Premium landing preview |
| 10874 | handbrake-mcp | Web dashboard frontend |
| 10875 | handbrake-mcp | Web dashboard backend |
| 10876 | virtualdj-mcp | Web dashboard frontend |
| 10877 | virtualdj-mcp | Web dashboard backend |
| 10878 | vienna-live-mcp | Web dashboard frontend |
| 10879 | vienna-live-mcp | Web dashboard backend |
| 10880 | vroidstudio-mcp | Web dashboard frontend |
| 10881 | vroidstudio-mcp | Web dashboard backend |
| 10882 | suno-mcp | Web dashboard frontend |
| 10883 | suno-mcp | Web dashboard backend |
| 10884 | songgeneration-mcp | Web dashboard frontend |
| 10885 | songgeneration-mcp | Web dashboard backend |
| 10886 | myconf | web_sota frontend |
| 10887 | myconf | web_sota backend |
| 10888 | myai | web_sota frontend |
| 10889 | myai | webapp_api backend |
| 10892 | yahboom-mcp | Web dashboard backend (API) |
| 10893 | yahboom-mcp | Web dashboard frontend |
| 10894 | dreame-mcp | Web dashboard backend (API) |
| 10895 | dreame-mcp | Web dashboard frontend |
| 10924 | kyutai-mcp | Web dashboard backend (FastAPI) |
| 10925 | kyutai-mcp | Web dashboard frontend (Vite) |
| 10926 | kyutai-mcp | MCP HTTP `/mcp` |

## Port Allocation Registry (Live)

Source of truth in machine-readable JSON:
- [webapp-registry.json](./webapp-registry.json)
- [container-registry.json](./container-registry.json)
- **RoboFang stack** (hub, bridge, supervisor): `src/robofang/configs/fleet-stack-ports.json` — `web_port`, `bridge_port`, `supervisor_port`. Start scripts and Python (supervisor, main) read from this; env `PORT` / `SUPERVISOR_PORT` override.

> **FORBIDDEN PORTS (3000, 5000, 5173, 8000, 8080)**: Strictly prohibited for production webapps. Any webapp found on these ports will be forcefully migrated.

## New Webapp Checklist

1. Pick next available port from registry (check for gaps)
2. Add entry to this document
3. Configure via env: `WEB_PORT=107xx` or `PORT=107xx`
4. Update vite.config.ts proxy if using Vite dev

## Webapp Startup (MANDATORY)

Every start script MUST clear its port of zombies before binding. Required files: `start.ps1` + `start.bat`.

```powershell
# start.ps1 pattern
$WebPort = 10700   # YOUR port from registry
npx --yes kill-port $WebPort 2>$null
# OR: Get-NetTCPConnection -LocalPort $WebPort -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

```bat
@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
```
