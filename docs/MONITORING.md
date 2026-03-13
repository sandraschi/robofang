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
