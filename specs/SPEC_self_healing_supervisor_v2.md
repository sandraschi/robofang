# SPEC: Self-Healing Supervisor v2

**Status**: Draft  
**Author**: Sandra Schipal  
**Date**: 2026-07-30  
**Target**: robofang v1.9.0

## Goal

Transform the supervisor from a simple heartbeat + restart loop into an intelligent, dependency-aware fleet health manager with escalation channels.

## Why

The current supervisor (`src/robofang/supervisor.py`) restarts on crash but knows nothing about inter-service dependencies (restarting the thin MCP server before the bridge is up is pointless), has no backoff strategy (flapping services cause log spam), and doesn't escalate to Sandra when a service refuses to stay up. Three real incidents in July 2026 required human intervention that the supervisor should have handled.

## Requirements

### 1. Dependency-Aware Restart Ordering

The supervisor must know which services depend on which:

```yaml
# configs/supervisor_deps.yaml
services:
  robofang-bridge:
    port: 10871
    depends_on: []           # bridge is root dependency
    health_url: /api/health

  robofang-supervisor:
    port: 10872
    depends_on: []           # runs independently

  robofang-mcp:
    port: 10873
    depends_on: [10871]      # must wait for bridge
    health_url: /health
```

When a service dies:
1. Kill all dependents first (bottom-up)
2. Restart the failed service
3. Wait for health check
4. Restart dependents (top-down)

### 2. Exponential Backoff + Circuit Breaker

| Consecutive Failures | Action |
|----------------------|--------|
| 1-2 | Normal restart (immediate) |
| 3-5 | Wait 30s before restart |
| 6-10 | Wait 120s before restart, log WARNING |
| 11+ | Circuit open — stop restarting, mark `unhealthy`, escalate |

### 3. Escalation Channels

When a service enters circuit-open state:

1. **Discord**: `ROBOFANG_DISCORD_WEBHOOK` — "🛑 robofang-bridge has failed 11+ times in 5 minutes. Manual intervention required."
2. **Telegram**: `ROBOFANG_TELEGRAM_TOKEN` + `CHAT_ID` — same message
3. **Robofang TTS**: Speak alert via kyutai-mcp voice bridge
4. **Repeat**: Re-escalate every 30 min until service recovers

### 4. Health Pulse Loop

- Poll every connected fleet server's `/api/health` on a configurable interval (default 30s)
- Maintain `fleet_health.json`: timestamp, status, latency, tool_count per server
- Expose as MCP resource `resource://supervisor/fleet-health`
- Surface in the hub dashboard with live red/yellow/green indicators

### 5. Metrics

The supervisor already exposes Prometheus `/metrics`. Add:
- `robofang_restarts_total{service="bridge"}` counter
- `robofang_circuit_breaker{service="bridge"}` gauge (0=closed, 1=open)
- `robofang_health_check_duration_ms{service="bridge"}` histogram

### 6. MCP Tools

- `robofang_supervisor_status` — all managed services, health, backoff state
- `robofang_supervisor_restart(service)` — manually trigger dependency-aware restart
- `robofang_supervisor_reset_circuit(service)` — reset circuit breaker for a service

## Non-Goals

- Auto-scaling (no Kubernetes-style replica management)
- Cross-machine supervision (single-host for v2)
- Blue/green deployments

## Implementation Sketch

```
src/robofang/supervisor/
├── __init__.py
├── deps.py            # dependency graph parsing + traversal
├── circuit.py         # backoff counter + circuit breaker state
├── escalation.py      # Discord/Telegram/TTS dispatch
├── health_pulse.py    # fleet-wide health polling loop
├── metrics.py         # Prometheus instrumenter
└── tools.py           # supervisor MCP tools
```

## Open Questions

- Should the supervisor itself be supervised (who watches the watcher)? Self-restart via a scheduled task might be simplest.
- How do we distinguish "service crashed" from "service is slow and hasn't responded yet"? Use a grace period (e.g., 3x health check interval).
