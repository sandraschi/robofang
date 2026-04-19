# PRD: robofang Sovereign Orchestration Hub

**Status**: ACTIVE DRAFT (Phase 4)  
**Owner**: Sandra Schipal  
**Vision**: A [reductionist and materialist](PHILOSOPHY.md), industrial-grade orchestration layer for a federated fleet of MCP servers, enabling autonomous synthesis, hardware synchronization, and sovereign observability.

---

## 1. Executive Summary

robofang is the central orchestration hub for a distributed fleet of AI-driven tools. It moves beyond simple tool-calling into **Active Synthesis** through a "Council of Dozens" architecture, where multiple specialised agents adjudicate complex workflows in parallel, evaluate their conclusions, and converge on a unified execution plan â€” all within containerised safe-zones that prevent unintended side-effects.

The project sits at the intersection of systems engineering and automation research. The Council's architecture â€” perceive, think, act, audit â€” is a deliberate structural implementation of a closed-loop control system, designed to provide high-fidelity feedback and error correction. The practical claim is verifiable: an agent with a persistent memory substrate, a rich sensorimotor interface, and an adversarial evaluation layer will produce demonstrably more coherent and explainable behaviour than a stateless tool-caller. We are not building conscious systems; we are building a robust feedback-driven control layer and measuring its operational performance.

> **On embodiment and substrate**: A well-crafted virtual agent in a high-fidelity Resonite environment is a **functionally equivalent** embodiment substrate to physical hardware (e.g., Unitree G1) for the purpose of autonomous behavior research and HRI (Human-Robot Interaction) validation. The closed-loop control logic is consistent across both platforms. Virtual simulation is an engineering prerequisite for physical deployment, ensuring behavioral stability before hardware activation.

---

## 2. Core Pillars

### I. Federated Orchestration (Fleet Management)

robofang's primary operational role is maintaining a live map of the entire Sandra-class MCP fleet â€” currently 20+ repositories spanning robotics, 3D tooling, social VR, security, and memory systems. The fleet indexer performs continuous discovery across `D:/Dev/repos`, extracting tool schemas, port bindings, and health signals from each server. The result is a capability graph: a queryable, semantic index of what every server in the fleet can do, what it currently is doing, and whether it is healthy. Council agents consult this graph when forming execution plans; the Sovereign Dashboard surfaces it for human inspection in real time.

### II. The Council of Dozens (Active Synthesis)

The Council is the arbitration layer for complex, multi-step tasks that a single LLM call would resolve poorly. Each council member is a specialised agent with a defined role, a curated set of tool bridges, and a Pydantic-typed result schema. The **Foreman** architects the plan. The **Labor** agents execute it via ReAct loops. The **Satisficer** audits the outcome against the original specification. In cases of disagreement or partial failure, the **Adjudicator** synthesises a corrected plan from the debate record. The goal is not consensus for its own sake but *decision quality* â€” the highest-fidelity response achievable given the available information and tools.

The Council maps directly onto the agentic mesh architecture described in `AGENTIC_MESH_INTEGRATION.md`: each member is a `ctx.sample()` meta-tool, with bridges validated in Python code (not by LLM discretion), and a maximum hop count of 3 to prevent recursive amplification.

### III. Sovereign Control (UI/UX)

The Sovereign Dashboard (port 10864) is the human interface to the entire system. It surfaces the Deliberations feed â€” a real-time transcript of the Council's Forensic Trace, showing the internal reasoning of agents as they work. It displays fleet health across all registered MCP servers, active council sessions, safety heartbeats from Bastion monitors, and the current state of any active simulation (Resonite session, WorldLabs world generation queue). The dashboard is not a monitoring panel bolted on as an afterthought; it is designed from the ground up as the primary control surface for a human operator who needs to understand and intervene in autonomous agent workflows.

### IV. Simulation Layer (Embodiment Substrate)

The Simulation Layer is the substrate through which robofang's agents interact with a world. It comprises two complementary components.

**World Generation** is handled by `worldlabs-mcp`, which wraps the World Labs Marble API. Given a natural language prompt ("a busy Vienna coffee shop, afternoon light, wooden tables"), Marble produces a photorealistic 3D Gaussian Splat (SPZ) for visuals and a matching GLB collision mesh for physics. These assets are routed downstream to `blender-mcp` or `unity3d-mcp` for processing, and ultimately into Resonite headless for deployment. The pipeline runs end-to-end under Council orchestration: a single task dispatched to the relevant agents produces a navigable, human-joinable 3D environment within minutes.

**Virtual Embodiment** is provided by `resonite-mcp` and `osc-mcp`. A robot avatar â€” derived from a Unitree URDF, a VRM character model, or a custom design â€” is spawned into the generated world. Joint states are published by `osc-mcp` at 30 Hz to Resonite ProtoFlux listeners via `/avatar/joint/{name}/rotation` OSC addresses. The avatar moves. Real humans can join the session and interact with it. Their proximity, speech, and actions feed back as OSC events into the agent's Perception layer. This is the HRI (Human-Robot Interaction) loop â€” and it works identically whether the "robot" is a virtual avatar or is later bridged to physical hardware via ROS2.

The **Virtual-First Policy** formalises the engineering sequence: Resonite is the primary testbed for HRI evaluation, social navigation, and behavioural validation. Gazebo is reserved for kinematics and SLAM work that requires physical simulation accuracy. No physical hardware purchase is authorised until a virtual equivalent has passed 48 hours of adversarial HRI testing in Resonite.

### V. Local Inference (Sovereign AI)

The inference layer is deliberately cost-sovereign. An RTX 4090 with 24 GB GDDR6X VRAM runs Ollama as the primary inference runtime, serving open-weight models â€” Llama 3.3 70B (4-bit quantised, ~24 GB), Gemma 3 27B (~16 GB), Qwen 2.5 32B (~18 GB) â€” at zero per-token cost. Council operations, memory retrieval, specification generation, and adversarial auditing all run locally. Cloud APIs (Gemini, Claude, GPT) are reserved for frontier capability gaps: tasks that specifically require capabilities not yet available in open-weight models.

The practical consequence is that sentience research â€” running thousands of PERCEIVEâ†’THINKâ†’ACT cycles, logging everything to `memops`, iterating on behavioural parameters â€” costs electricity, not API budget. This is not a minor operational detail. It is what makes the research loop sustainable. The `local-llm-mcp` server proxies Ollama and LM Studio into the council tool mesh, exposing them as standard MCP tools and making the inference backend swappable without touching agent code.

---

## 3. Technical Requirements

### Backend Stack

The server layer is built on **FastMCP 3.1.1+.4+** (Python), which provides the sampling, portmanteau, and conversational tool return patterns required for Council orchestration. `pywinauto` handles legacy UI automation for desktop applications (VRoid Studio, Unity Editor) that lack API interfaces. All services expose both stdio (MCP protocol) and HTTP/WebSocket endpoints, with the HTTP surface serving the Sovereign Dashboard and external integrations.

### Simulation Stack

The simulation pipeline runs: `worldlabs-mcp` â†’ Marble API â†’ SPZ (visual) + GLB (collision mesh) â†’ `unity3d-mcp` or direct Resonite import â†’ `resonite-mcp` â†’ Resonite headless session â†’ `osc-mcp` joint control at 30 Hz. The avatar pipeline converts physical robot descriptions (URDF) or character models (VRM) to GLB, spawns them via `resonite_inventory_spawn`, and wires ProtoFlux joint listeners in-world. The OSC bridge exposes 19 tools for message construction, routing, and recording.

### Local Inference Stack

**Runtime**: Ollama (primary), LM Studio (secondary).  
**Recommended models for RTX 4090**: Llama 3.3 70B (4-bit, ~24 GB), Gemma 3 27B (4-bit, ~16 GB), Qwen 2.5 32B (~18 GB), Phi-4 14B (~8 GB for fast drafts).  
**Integration**: `local-llm-mcp` proxies all backends into the council mesh. Model selection is routed by task type â€” fast drafts to the 14B, council reasoning to the 70B, multimodal to cloud when required.

### Frontend Stack

React + Vite + TypeScript with Vanilla CSS (glassmorphism, dark mode, micro-animations). Port allocation: **10864** (Sovereign Dashboard frontend), **10865** (robofang API / backend bridge).

### Infrastructure

Windows Sandbox (`.wsb`) and Sandboxie-Plus provide isolated execution environments for Phase 2 (Labor) operations that involve file modification, code execution, or external API calls. Advanced Memory (`memops`) is the stateful substrate â€” every significant agent decision, interaction, and outcome is written to the knowledge graph. The **DTU (Dark Twin Universe)** proxy maintains a virtualized shadow of the filesystem against which Labor operations are audited before being committed to the live universe.

---

## 4. Success Metrics

robofang's success is measured on five axes. **Synthesis speed**: sub-10 seconds for a full Council round-trip from raw prompt to unified execution plan. **Fleet availability**: 99.9% visibility across all registered MCP repositories, with sub-second health polling. **Aesthetic integrity**: zero-compromise design standards in the dashboard; strictly premium, industrial-grade interface quality. **Behavioral validation**: measurable improvement in response coherence, contextual awareness, and memory utilization across successive Resonite sessions â€” tracked statistically across the Forensic Trace logs. **Inference cost**: council operations at â‰¤â‚¬0.01 per session, with cloud API spend below â‚¬20/month under normal research load. The **Virtual-First Gate** is a strict policy metric: no physical hardware purchase proceeds without a successful 48-hour adversarial validation run in simulation.

