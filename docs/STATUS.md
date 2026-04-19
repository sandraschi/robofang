# RoboFang Status

> Real-time health, technical debt registry, and dependency audit.

---

## System Health Overview

| Component | Status | Port | Health Check |
|-----------|--------|------|--------------|
| **Bridge** | ✅ Operational | 10871 | `GET /health` |
| **Supervisor** | ✅ Operational | 10872 | Process running |
| **Heartbeat** | ✅ Operational | 10872 | Async integrity checks |
| **Dashboard** | ✅ Operational | 10864 | Frontend loading |
| **Ollama** | ✅ Operational | 11434 | `GET /` |
| **Council** | ✅ Hardened | — | Robust ReAct (v12.1) |
| **Hands** | ✅ Operational | — | Discovered: 11 |

---

## Connector Gaps & Weaknesses

To achieve parity with industry-leading frameworks like OpenClaw, the following areas require development:

| Domain | Status | Gap |
|--------|--------|-----|
| **Social / Messaging** | ⚠️ Weak | Discord/Slack connectors need more robust real-world testing. |
| **Mobile Integration** | ❌ Missing | No native support for WhatsApp, Signal, or Telegram status polling. |
| **Cloud Office** | ❌ Missing | No native connectors for Microsoft 365, Notion, or Google Workspace. |
| **Voice Interface** | [/] In Progress | Kyutai Moshi integration is functional but lacks persona-aware persistence. |

---

## Technical Debt Registry

| Debt Item | Severity | Impact | Mitigation Plan |
|-----------|----------|--------|-----------------|
| **XML Regex Parsing** | **Critical** | ReAct loop fragility on small models | Migrate to Ollama `/api/chat` tool-use API. |
| **Hardcoded Paths** | ✅ Audited | Repo portability | `ROBOFANG_REPOS_ROOT` established as standard. |

---

## Dependency Audit

### Python (uv sync / pyproject.toml)

| Package | Purpose | Version | Status |
|---------|---------|---------|--------|
| `fastapi` | API Gateway | `0.111+` | ✅ SOTA |
| `fastmcp` | MCP Framework | `3.1+` | ✅ SOTA |
| `pydantic` | Data Validation | `2.7+` | ✅ SOTA |
| `httpx` | Async HTTP Client | `0.27+` | ✅ SOTA |
| `lancedb` | Vector Database | — | ✅ SOTA |
| `fastembed` | Embeddings | — | ⚠️ Cache issues fixed |
| `python-osc` | Robotics Comms | `1.8.3+` | ✅ Verified |

---

## Known Issues

1. **Member Disconnect**: If an Ollama member is unloaded from VRAM, the Council session hangs for 30s before timeout.
   - *Fix: Implement pre-session ping to all council members.*
2. **Dashboard Vibe Lag**: Deliberations feed (SSE) can lag if more than 50 events are buffered.
   - *Fix: Implement frontend pagination or virtualization for logs.*
3. **ResoniteLink Jitter**: High-frequency Joint control can cause UI jitter in Resonite.
   - *Fix: Implement client-side interpolation or reduce OSC frequency to 30Hz.*
4. **GPU Race Condition**: Swapping a Tier 1 (70B) model into VRAM before Tier 2 is fully unloaded causes an OOM crash.
   - *Fix: Implement strict sequential queuing in the [VRAM Orchestrator](MODEL_ECONOMY.md).*
5. **Prompt Leakage**: System prompts can sometimes be leaked via Tainted tools if output isn't properly sanitized.
   - *Fix: Implement the [Injection Shield](INJECTION_SHIELD.md) and taint tracking.*

---

## Maintenance Log

- **2026-03-28**: [Bug Bash & Stability Sprint](walkthrough.md) (v12.1) — Hardened ReAct loop, async Heartbeat service, and path auditing.
- **2026-03-28**: Updated documentation suite for grounded terminology and mobile access.
- **2026-03-27**: Moshi voice pipeline integration completed.
- **2026-03-25**: Advanced memory ADN note-taking automated.
- **2026-03-20**: Initial Yahboom LiDAR mapping verified.
