# RoboFang Bridge — correctness and functionality

## Verdict: **Correct and functional**

The bridge (`src/robofang/main.py`) is the real Sovereign Bridge: FastAPI app + FastMCP 3.1 unified gateway, orchestrator lifecycle, SOTA launch, proxy, and dashboard API. No mock or placeholder.

---

## What works

| Area | Status | Notes |
|------|--------|--------|
| **Entry** | OK | `main()` runs uvicorn on `PORT` (default 10871). `robofang.main:app` is the ASGI app. |
| **Startup** | OK | `startup_event()` calls `orchestrator.start()`, then `auto_launch_enabled_connectors()` (background task). Shutdown calls `orchestrator.stop()`. |
| **Orchestrator** | OK | Loads `configs/federation_map.json`, builds topology, initializes connectors from env + topology, connects them, starts heartbeat loop and hands. |
| **MCP** | OK | `FastMCP.from_fastapi(app)`; `register_mcp(mcp, orchestrator)` registers tools/prompts; SSE at `/sse`. |
| **SOTA launch** | OK | `POST /api/connector/launch/{name}` uses `REPO_MAP` and runs repo `start.ps1` (or `start.bat`) via PowerShell in new console. `auto_launch_enabled_connectors()` uses same `launch_connector()`; `REPO_MAP` is defined at module load so available when startup runs. |
| **Fleet API** | OK | `/fleet` merges live connectors, federation_map connectors, and domains. `/health`, `/system` use orchestrator and bridge state. |
| **Home proxy** | OK | `/home/{connector}` and `/home/{connector}/{path:path}` proxy to `MCP_BACKENDS` with 503/504 on connect/timeout. `/home` pings all backends in parallel. |
| **CORS** | OK | Allows 10864, 10870, 5173 (Vite). |
| **Log ring** | OK | `_RingHandler` on root logger; `/logs` returns filtered ring buffer; `/deliberations` from orchestrator.reasoning_log. |
| **Ollama proxy** | OK | `/api/llm/models`, `/api/llm/load`, `/api/llm/generate` proxy to `OLLAMA_URL`. |

---

## Minor issues / quirks

1. **Diagnostics and supervisor in-process**  
   `diagnostics_router` (included in main) does `from robofang.supervisor import supervisor` and uses `supervisor.get_pulse()`, `supervisor.fleet_nodes`, etc. That runs **supervisor module code inside the bridge process**. The bridge did not start itself via `BridgeProcess`, so `_bridge.status["running"]` is false in this process; the adversarial check still does a socket connect to 10871, which succeeds because the bridge is listening. So heartbeat can stay "nominal". Fleet data comes from `FleetHealthMonitor` / `FleetManager` reading `mcp-central-docs` registry — fine. Net: works, but the bridge and supervisor are conceptually two processes; having the bridge import supervisor is a bit odd.

2. **Optional substrate on 10867**  
   `MCP_SERVER_URL = "http://localhost:10867"` is used for `/api/diagnostics/heartbeat` and `/api/diagnostics/forensics` in main (the proxy to the “MCP substrate”). If nothing runs on 10867, those return OFFLINE/fail. That’s an optional separate service, not a bug.

3. **REPO_MAP vs MCP_BACKENDS**  
   Connector names in `REPO_MAP` (SOTA launch) and `MCP_BACKENDS` (proxy) are aligned; both use the same name keys. No inconsistency found.

4. **launch_app path check**  
   `POST /api/fleet/launch` restricts to `Path("D:/Dev/repos")` and looks for `web_sota/start.ps1` or `web/start.ps1`. Hardcoded drive/path; fine for your env.

---

## Config and paths

- **Topology**: `configs/federation_map.json` (repo root). Present and valid; `connectors` and optional `enabled_connectors` drive which connectors start.
- **Orchestrator**: `fleet_config_path` = `_PKG_ROOT / "configs" / "federation_map.json"` with `_PKG_ROOT` = repo root (from `core/orchestrator.py`). Correct.

---

## Summary

The bridge is correctly structured and functional: startup/shutdown, orchestrator, MCP registration, SOTA launch, fleet and health APIs, home proxy, logs, and LLM proxy all behave as intended. The only caveats are the in-process use of the supervisor module in diagnostics (works but is a design quirk) and the optional 10867 substrate. No changes required for normal operation.
