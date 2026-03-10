# RoboFang startup assessment

## Scripts

| Script | Role |
|--------|------|
| **start_all.ps1** (repo root) | Starts supervisor (:10872), then **real bridge** (`python -m robofang.main` on :10871), then dashboard (:10870). Single source of truth for the bridge when run from root. |
| **dashboard/start.ps1** | Supervisor-led: starts supervisor only, then POSTs `supervisor/start` so the **supervisor** spawns the bridge. Bridge is the same `robofang.main`. |

## Bridge identity

- **Real bridge**: `python -m robofang.main` (or console script `robofang-bridge` → `robofang.main:main`). Serves FastAPI + MCP on :10871.
- **No mock/placeholder** in repo: `src/robofang/main.py` is the full Sovereign Bridge. If you saw “placeholder” behaviour, likely causes:
  1. **Double start**: `start_all.ps1` used to call `supervisor/start` when `-StartBridge` was set, so a **second** bridge process was started; one could fail to bind or the wrong process could be talking to the dashboard. **Fixed**: step 2 no longer calls `supervisor/start`.
  2. **Wrong env**: Ensure you run from repo root so `PYTHONPATH` includes `$RepoRoot\src` and the bridge loads this repo’s `robofang`, not another install (e.g. openfang).
  3. **Port already in use**: Another process on :10871 (e.g. old openfang stub) would prevent the real bridge from binding; dashboard would then hit the other process.

## Fix applied (start_all.ps1)

- Step 1.1 is the **only** place this script starts the bridge; it always uses `python -m robofang.main`.
- Step 2 no longer calls `supervisor/start`; it only prints that the bridge is already running and that connectors auto-launch from bridge config.
- Comment and header updated so it’s explicit that this script starts the real bridge and must not trigger a second one via supervisor.

## Antigravity / IDE hanging

Not addressed here. If Antigravity hangs, run `.\start_all.ps1` from a normal PowerShell terminal from repo root; bridge logs go to `D:\Dev\repos\temp\bridge_*.log`.
