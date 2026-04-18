# Architecture: RoboFang v1.8.0

RoboFang is a deterministic orchestration node designed for high-fidelity agentic coordination and physical agency.

---

## 🏗️ The Mission Loop
RoboFang implements a multi-phase pipeline designed to ensure every high-level goal is processed through a verifiable sequence:

### Phase 1: Enrich (The Foreman)
The system routes the user intent to the **Foreman** (typically a high-intelligence model). The Foreman generates a comprehensive **Technical Specification** for the task, which is then signed via **HMAC-SHA256** using the `ROBOFANG_FOREMAN_SECRET`.

### Phase 2: Execute (The Labor)
The signed specification is passed to the **Labor** agents. These agents execute the task using the **Connectors** and **MCP Servers**. 
- **DTU Staging**: System changes are staged in the **Dark Twin Universe** (shadow directory) rather than the live environment.

### Phase 3: Audit (The Satisficer)
Once execution is complete, the **Satisficer** (Auditor) compares the result against the initial signed Foreman spec. If the criteria are met, the **DTU Proxy** performs an atomic commit.

---

## 🔒 Security Layers: Bastio & Bastion

### Bastio (HMAC Verification)
The **Bastio Gateway** ensures that no execution plan can be triggered unless it carries a valid signature from a trusted planning model. This prevents unverified instructions from escalating into system actions.

### Bastion (Resource Guard)
The **LocalBastionManager** monitors the CPU and RAM usage of child processes. If an agent-spawned process exceeds defined limits, the Bastion terminates the PID to preserve system stability.

---

## 🌐 Network Strategy: Tailscale Secure Bindings
v1.8.0 prioritizes a closed network posture.
- **Dynamic Secure Binding**: RoboFang prioritizes the `100.x.x.x` (Tailscale) address for inter-process communication.
- **Closed Loop**: Services are inaccessible from the public local network, ensuring the fleet remains private and sovereign.

---

## 📊 Terminology Note
To maintain clarity between software agents and hardware:
- **Hand**: Refers to a **Subordinate Autonomous Agent Process** (a metaphor for agentic reach).
- **Manipulator / Actuator**: Refers to **Physical Robotic Hardware** (e.g., arms, grippers, legs).
