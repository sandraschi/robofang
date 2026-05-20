# DeepFang Integration

**Status:** Wired (2026-05-04) — requires deepfang Docker stack running on ports 10956-10963

## What It Does

DeepFang adds a hard-isolated, LLM-adjudicated execution layer between RoboFang's orchestrator and high-risk tool calls. It runs a three-stage pipeline:

```
robofang execute_tool()
    → security.validate_action()
        → deepfang_sanitize    (regex + threat scoring, <5ms)
        → deepfang_adjudicate  (DeepSeek-V4-Pro, only if threat_score > 0.3)
    → defenseclaw.validate_action()  (existing sandbox, unchanged)
    → actual tool execution
```

The worker container is air-gapped at the Docker network layer (`internal: true`) — no WAN egress possible regardless of what the agent tries to execute.

## Which Tools Route Through DeepFang

High-risk prefix matching in `security.py`:

| Prefix | Why |
|--------|-----|
| `mcp_windows-operations_*` | Shell execution, registry writes |
| `mcp_docker_*` | Container lifecycle, image pulls |
| `skill_run_shell` | Direct shell passthrough |
| `skill_execute` | Generic execution skills |
| `skill_mutate` | Config/file mutation skills |

To add more prefixes: edit `HIGH_RISK_PREFIXES` in `src/robofang/core/security.py`.

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| DeepFang stack down | **Fail-closed** — high-risk actions blocked until stack is up |
| Sanitizer returns `allowed: false` | Blocked, logged, not passed to DefenseClaw |
| Adjudicator returns `deny` | Blocked, logged, not passed to DefenseClaw |
| Threat score ≤ 0.3 | Pass directly to DefenseClaw (no adjudication call) |
| DeepFang connector not active | Logged as warning, action blocked |

This is intentionally strict. If you need to bypass for a known-safe operation, add it to an allow pattern or lower the threat score threshold temporarily.

## Starting the Stack

```powershell
cd D:\Dev\repos\deepfang
.\start.ps1
```

Check health: `http://localhost:10957` (dashboard) or `GET http://localhost:10956/health`

## Ports

| Service | Port |
|---------|------|
| Supervisor MCP + API | 10956 |
| Dashboard | 10957 |
| Sanitizer | 10958 |
| DeepSeek Bridge | 10959 |
| Worker | 10960 |

## Audit Log

All adjudication decisions are logged. Query via MCP: `deepfang_audit(limit=50)` or `GET http://localhost:10956/api/audit`.

## Source

`D:\Dev\repos\deepfang` — see `docs/ARCHITECTURE.md` and `docs/SALVAGE_PLAN.md`.
