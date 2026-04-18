# Architecture: RoboFang v1.8.0 (OpenClaw++)

RoboFang is a deterministic, high-fidelity orchestration node designed for industrial-grade agentic coordination.

---

## 🏗️ The 3-Phase Mission Loop
Unlike legacy "chat-and-hope" orchestrators, RoboFang v1.8.0 implements the **OpenClaw++ Pipeline**. Every high-level goal is processed through three distinct cryptographic phases:

### Phase 1: Enrich (The Foreman)
The system routes the user intent to the **Foreman** (typically a high-intelligence model like DeepSeek-R1 or Llama 3.1 405B). The Foreman generates a comprehensive **Technical Specification** for the task, which is then signed via **HMAC-SHA256** using the `ROBOFANG_FOREMAN_SECRET`.

### Phase 2: Execute (The Labor)
The signed specification is passed to the **Labor** agents (specialized ReAct models like Llama 3.2 3B). These agents execute the task using the **Connectors** and **MCP Servers**. 
- **DTU Staging**: All filesystem changes are staged in the **Dark Twin Universe** (shadow directory) rather than the live environment.

### Phase 3: Audit (The Satisficer)
Once execution is complete, the **Satisficer** (Auditor) compares the result against the initial signed Foreman spec. If the criteria are met, the **DTU Proxy** performs an atomic commit to the live environment.

---

## 🔒 Security Moat: Bastio & Bastion

### Bastio (HMAC Verification)
The **Bastio Gateway** ensures that no execution plan can be triggered unless it carries a valid signature from a trusted Foreman. This prevents "prompt injection" or "hallucination-drift" from escalating into system actions.

### Bastion (Resource Guard)
The **LocalBastionManager** monitors the CPU, RAM, and disk quota of all child processes. If an agent-spawned process (e.g., a rogue `uv sync`) exceeds defined limits, the Bastion enters **Defensive Posture** and terminates the offending PID.

---

## 🌐 Network Topology: Tailscale Sovereignty
v1.8.0 moves away from the permissive `0.0.0.0` binding model.
- **Dynamic Secure Binding**: RoboFang prioritizes the `100.x.x.x` (Tailscale) address for inter-process and inter-device communication.
- **Closed Loop**: Services are inaccessible from the broader physical network (e.g., public Wi-Fi), ensuring your fleet remains a private, sovereign entity.

---

## 📊 Observability: Metrics & Cohesion
RoboFang exposes a **Prometheus-compatible `/metrics`** endpoint on the Bridge. This allows you to track:
- **Fleet Cohesion**: Success rate of Council adjudications.
- **Latent Agency**: Response times of individual MCP connectors.
- **Resource Pressure**: Memory consumption of the federated agent pool.
