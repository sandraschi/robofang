# robofang v2.0: Safety & Security Architecture

> [!IMPORTANT]
> robofang v2.0 "Dark Integration" enforces a strict isolation and monitoring policy to ensure agentic autonomy does not compromise host stability or data integrity.

## 1. DTU: Dark Twin Universe (The Safety Proxy)

The **Dark Twin Universe (DTU)** is the primary isolation layer for Phase 2 (Execute) operations.

- **Purpose**: Provides a high-fidelity "Shadow" environment where every file edit, terminal command, and tool call is intercepted and simulated against a twin state.
- **Mechanism**: All sandboxed tasks are routed through the `DTU_PROXY_URL`. This proxy maintains a virtualized view of the repository, allowing the **Satisficer** to audit the results before they are "pushed" to the live universe.
- **Safety Mode**: Standard in v2.0. Disabling DTU requires an explicit `safety_mode=False` override in the `SandboxDispatcher`.

## 2. Bastion: Resource Quota Manager

**Bastion** (`LocalBastionManager`) provides local resource protection.

- **Monitoring**: Tracks CPU and RAM consumption of all fleet processes (Sandboxie, WSB, etc.).
- **Enforcement**: Prevents "Recursion Toxification" or runaway processes from exhausting host resources.
- **Quotas**: Standard limits are set to 80% CPU/RAM, with hard-kill triggers at 95% (Phase 5).

## 3. Bastio: Policy Gateway

**Bastio** is the logic gatekeeper at the edge of the fleet.

- **Shadow Mode**: Acts as a "Passive Observer" during reasoning, logging intended actions without side effects.
- **Enforce Mode**: In production execution, Bastio validates every tool call against the **Foreman's Specification** generated in Phase 1. 
- **Signature Verification**: Future iterations will require cryptographic signing of specifications by the Foreman before Bastio allows execution.

## 4. Federated Safety (Multi-Repo)

When robofang operates across multiple repositories:
1. Each repository root requires a local `Bastion` instance.
2. The `Sovereign Dashboard` aggregates safety heartbeats from all active Bastions.
3. Centralized `AGENT_PROTOCOLS.md` rules define the global "Right to Intervene" for the human operator.

---

*Refer to `sandbox_dispatcher.py` for implementation details on proxy routing and resource tracking.*
