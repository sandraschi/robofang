# RoboFang monitoring (Prometheus, Loki, Grafana)

Bridge metrics and logs in one place so running RoboFang is easier to reason about. Council and operations logs scroll in the dashboard.

## What’s in place

- **Bridge** writes the same log stream to memory (GET `/logs`) and to **`logs/robofang-bridge.log`** (for Loki).
- **Prometheus** scrapes the bridge at **`:10871/metrics`** (request rate, latency, defaults from `prometheus-fastapi-instrumentator`).
- **Loki** receives log lines from **Promtail** (tail of `logs/*.log`).
- **Grafana** is provisioned with Prometheus + Loki and a **RoboFang Bridge** dashboard:
  - **Bridge status** (up/down)
  - **Request rate** and **latency (p95)** by handler
  - **Council / Operations log stream** (Loki panel: `{job="robofang"}`) — deliberations and bridge activity in one scrolling view.

## Quick start (recommended: infra stack)

From **repo root**, with the bridge already running (e.g. `.\robofang-hub\start.bat` or `.\start_all.ps1` so the bridge is on 10871):

1. Start the monitoring stack (stack name **monitoring**). Run from **repo root** so Promtail sees `./logs` (where the bridge writes `robofang-bridge.log`):

   ```powershell
   docker compose -p monitoring -f infra/docker-compose.monitoring.yml up -d
   ```

   To stop: `docker compose -p monitoring -f infra/docker-compose.monitoring.yml down`

   **Or:** from `robofang-hub/`, run `start-with-monitoring.bat` (or set `$env:ROBOFANG_START_MONITORING=1` and run `.\start.ps1`); the script will start the monitoring stack before the supervisor and hub.

2. Open Grafana: **http://localhost:3001** (infra maps 3001 to Grafana 3000). Login: `admin` / `robofang_admin`.

3. Open the **RoboFang** folder and the **RoboFang Bridge** dashboard. The “Council / Operations log stream” panel shows bridge (and council) log lines as they’re written.

## Ports

| Service   | Default port | Note                          |
|----------|-------------|-------------------------------|
| Bridge   | 10871       | Must be up for /metrics scrape |
| Prometheus | 9090     |                               |
| Loki     | 3100        |                               |
| Grafana  | 3000 or 3001| 3001 in infra compose         |

## Prometheus targets

- **robofang-bridge**: `host.docker.internal:10871` (or host IP if not Docker Desktop). Scrape path: `/metrics`.

## Log stream

- Bridge logs (including council-related logger output) go to **`logs/robofang-bridge.log`** in the repo. Promtail sends them to Loki with `job="robofang"`. The Grafana Loki panel uses `{job="robofang"}` so all tailed bridge log lines appear in “Council / Operations log stream”.

## Are logs caught by Loki?

Only if: (1) Bridge logs `File logging active: ...` at startup (else it only writes to the in-memory ring). (2) Promtail is running with a config that tails the repo `logs/` dir. (3) Use **infra/promtail.yml** and **infra/docker-compose.monitoring.yml** so Promtail mounts `../logs:/logs` and tails `/logs/*.log`; do not rely on **configs/promtail-config.yml** for bridge logs (it uses `/var/log/robofang/`, which the bridge does not write to). (4) Loki and Grafana are up. Quick check: Grafana Loki query `{job="robofang"}` should show recent bridge lines.

## Root docker-compose (optional)

The repo root also has `docker-compose.monitoring.yml` (builds from `containers/`). It uses different volume names; ensure Promtail’s config points at the path where `logs/robofang-bridge.log` is written and that the Prometheus config scrapes `robofang-bridge` at `:10871` (as in `configs/prometheus.yml`).

## Profiling and monitoring together

Monitoring gives **request-level** metrics (rate, latency per route). To see **where** time goes inside a request (council vs single, LLM vs tools), combine with profiling-style metrics.

### Option A: Custom metrics (recommended first step)

Add Prometheus histograms or summary metrics for key segments so Grafana shows a breakdown:

- `robofang_ask_duration_seconds` — total `/ask` (or chat) request.
- `robofang_council_duration_seconds` — time in council_synthesis (when council is used).
- `robofang_llm_call_duration_seconds` — per LLM call (single or council member).
- `robofang_tool_execution_duration_seconds` — per tool call, optionally by `tool_name`.

Implement by creating a small metrics module (use `prometheus_client` already pulled in by the instrumentator), then instrument `orchestrator.ask()`, `reasoning.council_synthesis()`, and the tool executor. The same `/metrics` endpoint exposes them; add panels to the existing Grafana dashboard. No separate profiling run — always-on, low overhead.

### Option B: On-demand profiling

For deep CPU hotspots (e.g. before trying PyPy or optimizing a loop):

- **py-spy**: `py-spy record -o profile.svg -p <bridge_pid> --duration 30` — 30s sample, view in browser or convert to flame graph. No code changes; run when the bridge is under load.
- **cProfile**: In code, `import cProfile; cProfile.runctx("await ask(...)", globals(), locals(), "ask.prof")` (or wrap a request); inspect with `snakeviz ask.prof` or `pstats`. Good for single-request breakdown.

Store `.prof` or `.svg` under `data/profiling/` (gitignored) and open locally. Optionally add a dev-only endpoint (e.g. `POST /admin/profile?seconds=30`) that runs py-spy or cProfile and returns the file — only enable behind a flag or in dev.

### Option C: Continuous profiling (later)

Tools like **Pyroscope** or **Google pprof** scrape profile data and can show flame graphs in a UI or in Grafana (e.g. Grafana Pyroscope datasource). Full integration: always-on profiling, query by time range. Heavier setup and more storage; consider only if you need continuous CPU profiling in production.
