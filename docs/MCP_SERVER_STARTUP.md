# How MCP servers are started and why hubs show them unconnected

## Architecture: webapp exposes the port, MCP server does not

- **MCP server**: Runs in-process with the webapp or as a child (e.g. stdio). It does **not** expose a port.
- **Webapp**: Exposes the port (e.g. 10740, 10720). It proxies or wraps MCP (e.g. HTTP at `/mcp`). So the URL in `MCP_BACKENDS` / `mcp_backend` is the **webapp** URL.
- **Liveness**: “MCP server running” = the **help tool** can be called and returns content. No help tool return → MCP server not running. The bridge uses this for `connector.active`.

## Two layers

| Layer | What it is | Where it runs |
|-------|------------|----------------|
| **External MCP + webapp** | Per-repo process(es): webapp on a port, MCP server running (stdio or in-process). Started by that repo’s `start.ps1` (or `start.bat`). | One process (or webapp + child MCP). |
| **Orchestrator “connectors”** | In-process plugins (e.g. `MCPBridgeConnector`) that talk to the **webapp** URL. They call the **help tool** to decide liveness: non-empty content → `active = True`. | Inside the bridge process. |

The hub pages get connector list and “online” from **GET /fleet**. That merges:

- **Live**: `orchestrator.connectors` → `status: "online"` iff `connector.active` is True.
- **Config**: All entries from `federation_map.json` `connectors` (so every configured server appears; the rest are `status: "offline"` if not in live or not active).

So “online” means: the connector called the MCP server’s **help tool** (via the webapp) and got non-empty content back. No help tool return → not running. The port we use is the webapp’s.

---

## How external MCP servers are started

**Only** via:

1. **Bridge startup**  
   `main.startup_event()` → `orchestrator.start()` → then (after 2 s) `auto_launch_enabled_connectors()`:
   - Reads `topology["connectors"]` from `configs/federation_map.json`.
   - For every entry with `enabled: true` **and** a name in `REPO_MAP` (in `main.py`), it calls `launch_connector(name)`.
   - `launch_connector(name)` runs:
     - `start_ps1 = Path(REPO_MAP[name]) / "start.ps1"` (or `start.bat` if no `.ps1`).
     - `subprocess.Popen(powershell -File start.ps1, cwd=repo_path, CREATE_NEW_CONSOLE)`.

2. **Manual**  
   Dashboard or API can call **POST /api/connector/launch/{name}** (same `launch_connector`).

So:

- If a connector is **enabled** in `federation_map.json` and its name is in **REPO_MAP**, the bridge will try to launch it once at startup.
- If the repo path is wrong, or `start.ps1`/`start.bat` is missing or fails, that MCP server never runs → connector stays offline.
- There is no per-repo “did start.ps1 succeed?” feedback; only bridge logs.

---

## Why hubs show “not running / unconnected”

1. **Connect before launch**  
   - `orchestrator.start()` runs first and calls `connector.connect()` for every enabled connector.  
   - At that moment no external MCP server has been started yet.  
   - `auto_launch_enabled_connectors()` runs **2 seconds later** and only then starts the `start.ps1` scripts.  
   So the first time we check, every MCPBridgeConnector fails `_ping()` → `active = False` → hub shows them offline.

2. **Retry is slow**  
   - The orchestrator heartbeat loop tries to reconnect inactive connectors, but only every **300 seconds** (5 minutes).  
   So even after the launched MCP servers are up, the hub can stay “offline” for up to 5 minutes until the next reconnect.

3. **Launch is a burst**  
   - All enabled connectors are launched in one go (no stagger).  
   - Many repos may start slowly (npm install, venv, etc.).  
   - No “wait until N servers are up” or readiness checks; we just fire and forget.

4. **REPO_MAP vs reality**  
   - `REPO_MAP` in `main.py` points to paths like `d:/Dev/repos/plex-mcp`, `d:/Dev/repos/obs-mcp`, etc.  
   - If a repo doesn’t exist or has no `start.ps1`/`start.bat`, that launch fails (404 or silent).  
   - The hub still shows that connector (from federation_map) but it will stay offline.

5. **URL/path mismatch**  
   - The connector talks to the **webapp** at `mcp_backend` (e.g. `http://localhost:10740/mcp`). The webapp must expose an MCP JSON-RPC endpoint (e.g. `/mcp`) that forwards to the MCP server.  
   - Liveness is now “help tool returns content”, not “tools/list 200”. So the webapp must proxy `tools/list` and `tools/call` to the MCP server; if the MCP server isn’t running, the help tool won’t return content → connector stays offline.

So: **without working MCP server processes and matching endpoints, the hub will show a full list of “connectors” from config but almost all offline** — hence “mock palace”: the list is real, the backend processes and their health are not guaranteed.

---

## Summary table

| Step | What happens |
|------|-------------------------------|
| 1 | Bridge starts; `orchestrator.start()` runs. |
| 2 | For each enabled connector, orchestrator creates an in-process connector (e.g. MCPBridgeConnector) and calls `connect()`. |
| 3 | Each connector tries to reach its `mcp_backend` (e.g. POST to `.../mcp`). Servers aren’t started yet → all fail → all `active = False`. |
| 4 | 2 s later, `auto_launch_enabled_connectors()` runs and starts each repo’s `start.ps1` (or `start.bat`). |
| 5 | No wait for readiness; no immediate retry. Heartbeat only retries every 300 s. |
| 6 | Hub shows “online” only when `connector.active` is True (i.e. after a successful connect or a later heartbeat reconnect). |

---

## Changes applied (startup order, reconnect, liveness)

- **Launch before connect**: Startup now runs `auto_launch_enabled_connectors()` first (no 2s delay), then sleeps 8s, then `orchestrator.start()`. So webapp/MCP processes are started before we call `connector.connect()`, giving them time to bind.
- **Faster reconnect**: Heartbeat loop in the orchestrator now sleeps 30s instead of 300s before reconnecting inactive connectors.
- **Liveness = help tool returns content**: `MCPBridgeConnector._ping()` no longer treats “tools/list 200” as “running”. It calls `tools/list`, finds a tool whose name contains `help`, calls that tool via `tools/call`, and sets `active = True` only if the response has non-empty text content. No help tool return → MCP server not considered running. Port remains the **webapp** port; the webapp proxies to the MCP server.

---

## Recommendations (short)

1. ~~**Launch before connect**~~ **Done:** launch runs first, then 8s sleep, then orchestrator.start().
2. ~~**Faster reconnect**~~ **Done:** heartbeat reconnects every 30s.
3. **Stagger launches**  
   When launching many repos, stagger by 1–2 s per connector to avoid a single burst of 20+ processes.

4. **Hub: show port status** (optional)  
   Use **GET /home** (which pings each `MCP_BACKENDS` port) in addition to **GET /fleet**, so the UI can show “process not running” (port down) vs “process running but bridge not connected yet” (port up, connector still offline).

5. **Align URLs** (optional)  
   Ensure each MCP server’s HTTP endpoint matches what `MCPBridgeConnector` expects (e.g. JSON-RPC at `.../mcp` if that’s what the connector pings). Document or centralize the convention (e.g. “all SOTA MCP servers expose POST /mcp”).

6. **REPO_MAP and start scripts** (optional)  
   Audit `REPO_MAP`: only include repos that exist and have a working `start.ps1` (or `start.bat`). Optionally, log or expose which launches succeeded/failed so operators can see why a connector stays offline.
