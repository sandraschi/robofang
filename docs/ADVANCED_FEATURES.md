# Advanced Features: RoboFang v1.8.0

Detailed technical overview of the primitives that power RoboFang's coordinated reasoning and security.

---

## 🏛️ Process Hierarchy: The Council Pattern
RoboFang utilizes a multi-agent orchestration pattern to improve reasoning fidelity. This moves beyond single-LLM tool use by establishing a hierarchy of specialized agent roles.

### 🎭 Agent Roles
- **The Foreman (Planner)**: A high-intelligence model that decomposes user intent into verifiable technical specifications.
- **The Labor (Workers)**: Models specialized in precise tool-invocation within the DTU shadow.
- **The Satisficer (Auditor)**: A distinct model role that verifies work against the signed specification before completion.
- **Adjudicators**: Optional domain-specific agents that provide signals during the planning phase.

### 🤝 Consensus Logic
The hierarchy ensures that conflicting tool calls or instructions are resolved through a tiebreaker policy, maintaining system stability during complex deliberations.

---

## 🌓 Dark Twin Universe (DTU)
The DTU is the filesystem safety layer. It prevents agents from making direct, unvetted changes to the host environment.

- **Shadow Staging**: File writes are redirected to a hidden shadow directory.
- **Audit Pass**: Changes are verified by the **Satisficer** before they are visible to the project.
- **Atomic Commit**: A verified move operation applies the changes to the live environment.

---

## 🛡️ Bastio HMAC-Signing
To ensure mission integrity, RoboFang implements cryptographic gating for all high-level plans.

- **Spec Signing**: The Foreman's mission plan is signed with an HMAC-SHA256 key.
- **Enforcement**: The execution agents will refuse to process plans that lack a valid signature or have been modified post-creation.

---

## 🛜 Secure Bindings & Tailscale
RoboFang prioritizes secure network communication via private mesh integration.

- **Tailscale Detection**: Automatically binds to the private mesh IP if available.
- **Access Control**: Fallback to `127.0.0.1` ensures services are not exposed to the public local network by default.
- **Path Hardening**: All internal system calls use absolute paths to mitigate environment-shadowing risks.

---

## 📈 Metrics & Observability
Integrates a Prometheus-compatible metrics suite for tracking system health.

- **Endpoint**: `/metrics`
- **Tracked Data**: Mission success rates, deliberation latency, and fleet connectivity status.
