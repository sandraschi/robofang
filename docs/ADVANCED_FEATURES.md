# Advanced Features: RoboFang v1.8.0

Deep dive into the industrial primitives that power the **OpenClaw++** standard.

---

## 🏛️ Cognitive Hierarchy: The Council of Dozens
The "Council of Dozens" is RoboFang's advanced multi-agent orchestration pattern. It moves beyond single-LLM tool use by establishing a formal hierarchy of specialized agents.

### 🎭 Specialized Roles
- **The Foreman (Planner)**: A high-intelligence model tasked with decomposing "vague" intents into signed technical specifications.
- **The Labor (ReAct Workers)**: Nimbly-sized models specialized in precise tool-invocation and execution within the DTU shadow.
- **The Satisficer (Auditor)**: A distinct model role that objectively verifies work against the signed spec before commit.
- **The Adjudicators**: Domain-specific council members (e.g., Security, UI/UX, Ethics) that provide "signals" during the plan refinement phase.

### 🤝 Consensus Logic
Individual agents can disagree. The Council implements a **Tiebreaker Policy** and a **Consensus Matrix** to resolve conflicting tool calls or planning instructions, ensuring the hub remains stable even under complex agentic deliberation.

---

## 🌓 Dark Twin Universe (DTU)
The DTU is RoboFang's filesystem safety layer. It prevents agents from making direct, unvetted changes to your repository or host system.

- **Shadow Staging**: When an agent attempts to write a file, the `DTUProxy` intercepts the request and redirects it to a hidden shadow directory (`.dtu_shadow/`).
- **Audit Requirement**: Changes in the shadow directory are invisible to the main project until they are audited by the **Satisficer** model.
- **Atomic Commit**: Once the Satisficer verifies the changes against the Foreman's spec, the `DTUProxy` performs an atomic move/overwrite to commit the changes to the live project.

---

## 🛡️ Bastio HMAC-Signing
To ensure "Agency Sovereignty," RoboFang implements cryptographic gating for all high-level mission plans.

- **Spec Generation**: The Foreman model generates a JSON specification for the mission.
- **HMAC Moat**: The Orchestrator signs this spec with `ROBOFANG_FOREMAN_SECRET`.
- **Enforcement**: The **Labor** agents (the models actually calling tools) will refuse to execute any plan that does not contain a valid signature or has been tampered with since creation.

---

## 🛜 Secure Bindings & Tailscale IP
RoboFang v1.8.0 automates the securing of your network layer using Tailscale.

- **Detection Logic**: The system calls `tailscale ip -4` to find your machine's private mesh IP.
- **Binding Strategy**:
    - **Priority 1**: Tailscale IP (for secure cross-device access).
    - **Priority 2**: `ROBOFANG_HOST` override.
    - **Priority 3**: `127.0.0.1` (fallback for offline/local-only).
- **Hardened Subprocesses**: All internal system calls (git, uv, npm) use absolute paths to prevent "path shadowing" attacks.

---

## 🆘 Emergency Escalation (The Escalator)
Agents can programmatically request human intervention when they encounter ambiguous or high-risk situations.

- **Trigger**: The `Escalator` plugin can be invoked via the `robofang_escalate` tool.
- **Mechanisms**: Generates a high-priority notification with an audit link to the current reasoning log.
- **Context Preservation**: The agent's current memory and deliberation chain are frozen until a human provides guidance or approval.

---

## 📈 Observability & Metrics
v1.8.0 integrates a full Prometheus metrics suite.

- **Endpoint**: `/metrics`
- **Key Metrics**:
    - `robofang_mission_success_rate`: Ratio of completions to audits.
    - `robofang_council_deliberation_time`: p95 latency of the Enrich phase.
    - `robofang_fleet_cohesion`: Number of active vs. configured MCP nodes.
    - `robofang_bastion_cpu_usage`: Real-time impact of agentic processing.
