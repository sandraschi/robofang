# RoboFang Roadmap

> Strategic development phases and capability expansion.

---

## Phase 1: Core Orchestration (Completed)

- [x] Three-process architecture (Dashboard, Bridge, Supervisor).
- [x] Council of Dozens protocol (Foreman, Worker, Satisficer, Adjudicator).
- [x] Federated MCP fleet indexer.
- [x] Basic "Hands" scheduling layer.
- [x] Local Ollama / LM Studio inference proxy.

---

## Phase 2: Embodiment (Current)

- [x] **Resonite Integration**: Joint control via `osc-mcp` (30 Hz).
- [x] **World Generation**: Automated Gaussian Splat (SPZ) to GLB pipeline.
- [x] **Humanoid Support**: Virtual twin behavior validation for Unitree R1 / G1.
- [/] **Feedback Loops**: HRI (Human-Robot Interaction) event tracing via OSC.

---

## Phase 3: Advanced Reasoning (Q2 2026)

- [ ] **ReAct Loop Migration**: Move from regex-based parsing to native Ollama `/api/chat` tool use.
- [ ] **Adjudication Optimization**: Implement multi-model consensus scoring.
- [ ] **Semantic Context**: Integrate `advanced-memory-mcp` for long-term project recall.
- [ ] **Task Decomposition**: Improve Foreman's ability to break complex tasks into parallel Sub-Hands.

---

## Phase 4: Creative & Production (Q3 2026)

- [ ] **3D Pipeline**: Deep integration with Blender/Unity for automated rigged model exports.
- [ ] **Audio/Voice**: Persona-aware persistence for Kyutai Moshi voice sessions.
- [ ] **Spatial Research**: Automated environment synthesis from verbal descriptors.

---

- [ ] **Remote Bridges**: Deep integration for Microsoft 365 and Google Workspace to handle scheduling and logistics via mobile.

---

## Phase 6: Live HRI & Frontier Bridges (NEW)

- [ ] **Gemini Live Integration**: Bridge Gemini 3.1 Flash Live for ultra-low latency multimodal interaction.
- [ ] **Context Injection**: Automated real-time grounding of live speech using active Workspace data.
- [ ] **Failover Logic**: Multi-provider failover between Gemini Cloud and local Moshi/Kyutai pipelines.

---

## Phase 7: Safety & Resource Hardening (NEW)

- [ ] **Financial Bastion**: Implement the token-counting and budget-enforcement middleware for all Cloud APIs.
- [ ] **VRAM Orchestrator**: Automated unloading/loading of models (Tier 1-3) to prevent GPU OOM conditions.
- [ ] **Taboo Enforcement**: Logic-level blocks for filesystem-destructive commands and protected path access.
- [ ] **Sandbox Isolation**: Full containerization of "Untrusted" or "Tainted" tool execution.

---

## Technical Debt Reduction

- [ ] **Generalize Paths**: Replace hardcoded `D:\` paths with environment-aware root variables.
- [ ] **Telemetry**: Standardize logging across all 30+ fleet connectors.
- [ ] **Recovery**: Automated state restoration for interrupted long-running Council tasks.

---

## 2026 Strategy: Materialist Stability

The goal for 2026 is **Reliable Autonomy**. We are transitioning RoboFang from an experimental orchestration hub to a production-stable control layer for local-first, privacy-conscious robotics and media workflows. 

Our focus is on **Materialist/Reductionist Stability**:
1. **Financial Predictability**: No unbounded API loops.
2. **Resource Efficiency**: Optimal 24GB VRAM utilization.
3. **Safety Sovereignty**: Hardcoded protection of the USER filesystem and privacy.

The "Virtual-First" policy remains the primary filter for all capability expansion, ensuring all robots (Unitree R1/G1) are validated in simulation before physical deployment.
