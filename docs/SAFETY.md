# RoboFang Safety: Risk & Mitigation

> [!CAUTION]
> Safety is an active engineering process, not a passive state. This document defines the risks associated with autonomous agent orchestration and the specific technical mitigations implemented in RoboFang.

---

## 1. Safety Pillars

| Pillar | Technical Solution |
|--------|-------------------|
| **Hardened Boundaries** | [Taboo Protocol](TABOO_PROTOCOL.md) for restricted paths/commands. |
| **Isolation** | [Sandbox Strategy](SANDBOX_SPEC.md) for destructive tool execution. |
| **Supervision** | [Financial Bastion](FINANCIAL_BASTION.md) for cloud budget and loop breaking. |
| **Integrity** | [Injection Shield](INJECTION_SHIELD.md) for taint tracking and fleet verification. |

---

## 2. Risk Matrix: Vulnerabilities & Mitigations

| Risk | Impact | Technical Mitigation |
|------|--------|-------------------|
| **Destructive Agent** | Deletion of critical data (Inbox, system files). | **Taboo Protocol** blocks path/command patterns; **Sandbox** isolates tool-use. |
| **Agentic Runaway** | Unbounded loops, high API bills, resource exhaustion. | **Financial Bastion** circuit breakers; **Supervisor** heartbeats. |
| **Prompt Injection** | Adversarial takeover of agent logic via external content. | **Taint Tracking** in the [Injection Shield](INJECTION_SHIELD.md); Mandatory HITL (Human-in-the-Loop) for high-risk actions. |
| **Supply Chain Poisoning** | Malicious code in an MCP fleet repository. | **Fleet Verification** heartbeat checks for unauthorized commits. |
| **GPU Contention** | Out of Memory (OOM) failures or UI freezing. | **VRAM Orchestrator** in the [Model Economy](MODEL_ECONOMY.md); Priority-based queuing. |

---

## 3. The "Destructive Agent" Problem

To prevent an agent from accidentally or maliciously deleting critical system folders (e.g., your Inbox or the root repository), RoboFang implements three levels of defense:

1. **Level 1 (Taboo)**: The Bridge intercepts all command strings (e.g., `rm`, `delete`, `truncate`) and checks them against a hardcoded list of forbidden paths (e.g., `C:/Users/sandr/Inbox`). If a match is found, the command is blocked **before** it reaches the shell.
2. **Level 2 (Shadow Filesystem)**: For any "Labor" task that modifies the filesystem, the agent is spawned in a **Windows Sandbox (.wsb)** with a cloned copy of the relevant files. The agent works in isolation.
3. **Level 3 (Supervisor Approval)**: No change made in the Sandbox is committed to the "Live" filesystem without a manual approval of the diff in the **Sovereign Dashboard**.

---

## 4. Prompt Injection (Direct & Indirect)

RoboFang treats all external data (Web, Email, Chat) as **Tainted**. 
- **Direct Injection**: An agent receiving instructions directly from an untrusted source is prohibited from executing financial or destructive tools.
- **Indirect Injection**: Data ingested by a "Perceive" tool (e.g., reading a webpage) is marked as `Tainted`. This taint propagates through the system. If tainte data is used in a "Think" prompt, the resulting plan is flagged for mandatory human review.

---

## 5. Continuous Verification

The **Fleet Verification** script (`fleet-verify.ps1`) runs every 4 hours or upon system startup. It scans all 30+ repositories in the fleet for:
- Unauthorized `.git` history manipulation.
- Addition of suspicious executable files.
- Changes to `mcp_config.json` that introduce unvetted external servers.

If any anomaly is detected, the **Supervisor** initiates a "Safe Mode" lock, preventing all autonomous activity until a manual audit is completed.
