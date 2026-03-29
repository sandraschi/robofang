# Security integrations roadmap (DefenseClaw, OpenShell, Bastio)

This document states **what is documented elsewhere**, **what is planned for RoboFang**, and **what is not implemented** in this repository’s bridge or hub webapp. It avoids implying that vendor products run inside RoboFang unless explicitly wired.

---

## Honesty contract

| Statement | Meaning |
|-----------|---------|
| **Documented** | Written guidance or research exists (this repo or MCP Central Docs). |
| **Planned** | Intended direction; no stable RoboFang↔vendor integration path shipped yet. |
| **Not in this repo** | No production connector, sidecar, or gateway code ships here today for that vendor. |

The hub UI uses **“Coming soon”** for planned items so operators are not misled into assuming Cisco, NVIDIA, or Bastio software is active by default.

---

## Cisco DefenseClaw (governance / agent security)

**What it is (vendor layer):** Cisco’s **DefenseClaw** ecosystem (e.g. `cisco-ai-defense/defenseclaw`) targets governance, monitoring, and MCP-oriented scanning patterns. It is **not** bundled inside RoboFang.

**Documentation:**

- This repo: [docs/EXTERNAL_AGENT_SECURITY_SCANNERS.md](./EXTERNAL_AGENT_SECURITY_SCANNERS.md) (scanner landscape, GitHub pointers).
- MCP Central Docs: `integrations/DEFENSECLAW.md` (governance sidecar pattern, Splunk notes — **architectural**, not a guarantee RoboFang implements Phase 9 as written there).

**RoboFang status:** **Planned / evaluate.** Treat any “compliant” or “sidecar” language in UI or drafts as **aspirational** until a concrete proxy or scanner hook is merged and documented in `docs/STATUS.md`.

---

## NVIDIA OpenShell (and NemoClaw as reference stack)

**What it is (vendor layer):** **OpenShell** is NVIDIA’s runtime / policy-hardening direction for autonomous agents; **NemoClaw** packages related ideas with OpenClaw-style stacks. RoboFang does **not** embed OpenShell.

**Documentation:**

- This repo: [docs/EXTERNAL_AGENT_SECURITY_SCANNERS.md](./EXTERNAL_AGENT_SECURITY_SCANNERS.md).
- MCP Central Docs: `research/NVIDIA_NEMOCLAW_ANALYSIS.md`, `integrations/nemoclaw.md`.

**RoboFang status:** **Planned / patterns only.** We may adopt **isolation and policy** ideas (e.g. stricter tool boundaries) without shipping NVIDIA’s runtime.

---

## Bastio (bastio.com)

**What it is (vendor layer):** **Bastio** is positioned as a **gateway**-class defense against prompt injection and indirect instruction in tool args and retrieved content (third-party product; verify on [bastio.com](https://www.bastio.com/)).

**Documentation:**

- Not first-class in this repo yet. Related pointer: MCP Central Docs `projects/openmanus-mcp/INTEGRATION.md` (Bastio mentioned alongside gateway / hygiene narrative).

**RoboFang status:** **Planned / evaluate.** No Bastio-specific adapter or API is in the bridge today. Any future integration should be documented here with explicit env vars, endpoints, and failure modes.

---

## What actually runs in RoboFang today (security-adjacent)

These are **in-repo** behaviors, not third-party certifications:

- **Orchestrator security checks** on `ask()` (subject authorization) — see `src/robofang/core/orchestrator.py`.
- **Optional `HeartbeatService`** (supervisor path) for repo / hash audits — **not** the same as DefenseClaw; see `src/robofang/core/heartbeat.py`.
- **Injection / tainted-data** patterns are described in project security docs where present; the **hub SPA** does not replace a SOC or a vendor gateway.

---

## Related links

| Resource | Location |
|----------|----------|
| External scanner survey (this repo) | [EXTERNAL_AGENT_SECURITY_SCANNERS.md](./EXTERNAL_AGENT_SECURITY_SCANNERS.md) |
| Control plane (fleet vs duplication) | [CONTROL_PLANE.md](./CONTROL_PLANE.md) |
| Operational status / debt | [STATUS.md](./STATUS.md) |
| DefenseClaw (central, pattern doc) | `mcp-central-docs/integrations/DEFENSECLAW.md` |
| External scanners (central mirror) | `mcp-central-docs/operations/EXTERNAL_AGENT_SECURITY_SCANNERS.md` |

---

## Change log

- **2026-03-28:** Initial draft; aligns hub UI “coming soon” labels with this roadmap.
