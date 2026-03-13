# Testing RoboFang

## Automated tests (backend)

Bridge API tests use a **mocked orchestrator** (no config, disk, or real MCP servers).

```powershell
cd D:\Dev\repos\robofang
uv run pytest tests -v
```

Or with the dev extra:

```powershell
pip install -e ".[dev]"
pytest tests -v
```

**What is tested** (`tests/test_bridge_fleet.py`)

- `GET /fleet` returns 200 and shape `{ success, summary, connectors, agents }`
- `POST /api/fleet/register` accepts connector config and returns 200
- `GET /api/connectors/{id}/status` returns 404 for unknown connector
- `GET /health` returns 200

The bridge app is loaded with a **mocked orchestrator** (and `auto_launch_enabled_connectors` patched) so no config, disk, or real MCP servers are required. Other tests (e.g. under `tests/connectors/`) may have different setup.

## Manual test: install → register → launch flow

Use this to verify the full onboarding flow (Installer → clone → register in topology → launch once → auto-start on next robofang start).

**Prerequisites**

- RoboFang bridge and supervisor running (`.\start_all.ps1`)
- Hub at http://localhost:10870
- Fleet registry at `mcp-central-docs/operations/fleet-registry.json` (or supervisor’s `FLEET_REGISTRY_PATH`) containing at least one node with `repo_path` and `id` (e.g. `blender-mcp`)

**Steps**

1. **Start robofang**  
   `.\start_all.ps1`  
   Wait until hub and bridge are up.

2. **Open Installer**  
   Hub → Fleet → Installer (or navigate to the Installer page).

3. **Install one node**  
   Select a single catalog entry (e.g. Blender MCP if present).  
   Click **Install**.  
   Wait until the install log shows “Installation complete” and the card shows completed (green check).

4. **Check topology**  
   - Open `configs/federation_map.json` (or the path in `OrchestrationClient.fleet_config_path`).  
   - The connector id (e.g. `blender` for `blender-mcp`) should appear under `connectors` with `enabled: true` and `mcp_backend` set.

5. **Check launch**  
   - A new console or process should have started for that MCP server (e.g. Blender MCP).  
   - Or call the bridge:  
     `Invoke-WebRequest -Uri "http://localhost:10871/api/connector/launch/blender" -Method POST`  
     and confirm 200 if the server is already running or starts.

6. **Restart robofang**  
   Stop (`Ctrl+C` or stop script), then run `.\start_all.ps1` again.  
   The connector you installed and registered should auto-start (bridge logs “Fleet Automation: Triggering auto-launch for 'blender'” or similar).

**Quick API checks (PowerShell)**

```powershell
# Fleet list (bridge)
Invoke-RestMethod -Uri "http://localhost:10871/fleet"

# Register a connector (bridge)
Invoke-RestMethod -Uri "http://localhost:10871/api/fleet/register" -Method POST -ContentType "application/json" -Body '{"category":"connectors","id":"test","config":{"enabled":true,"mcp_backend":"http://localhost:9999"}}'

# Health
Invoke-RestMethod -Uri "http://localhost:10871/health"
```

## Frontend (hub)

There is no test runner or Vitest setup yet. To add one later:

- Add `vitest` and `@testing-library/react` to `robofang-hub`.
- Add a `test` script and tests for `registryIdToConnectorId` and fleet API helpers (e.g. with `vi.mock` for `fetch`).

## Extending the scaffold

- **Backend:** Add more tests under `tests/`; use `client` from `conftest` and keep orchestrator mocked. For endpoints that call out to HTTP (e.g. connector status), use `respx` or `httpx.MockTransport` to fake responses.
- **Integration:** Optional script or pytest job that starts bridge (or supervisor) in a subprocess and hits real endpoints; document in this file and in CI if you add it.
