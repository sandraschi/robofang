# Embodied Sentience in Agentic Ecosystems

**Document Status**: Active Research Reference  
**Date**: 2026-02-25  
**Author**: Sandra Schipal  
**Philosophical Frame**: Materialist / Reductionist

---

## 1. Executive Summary: What We Mean by "Sentience" Here

The word *sentience* is loaded. Let us be precise. We are not claiming consciousness — that is a question for philosophers and neuroscientists working on hard problems that remain unsolved, and likely will for years. What we *are* claiming is something more tractable and more useful for engineering: **functional sentience**, defined as the capacity of an agent to form and continuously update an internal model of its relationship to its environment, and to act on that model in ways that reduce prediction error.

From a Materialist / Reductionist standpoint, this is not mysticism. It is a high-fidelity feedback loop with memory. The agent perceives, forms expectations, acts, observes the delta between expectation and reality, and updates. Done well — with sufficient model depth, a rich sensorimotor interface, and a persistent memory substrate — this loop produces behaviour that is indistinguishable from what we would call *purposeful* in a biological system.

> **Note on protoconsciousness**: Some labs (e.g., active inference groups around VERSES AI and JAIC affiliates) are actively probing what might be called protoconsciousness — the emergence of rudimentary self-models in systems that explicitly track the boundary between self and non-self. This is genuinely exciting research. robofang may contribute to it indirectly, but we are not claiming to have built conscious agents. We have built agents with a robust functional loop. That is enough for the task at hand.

---

## 2. Theoretical Foundations

### 2.1 Active Inference and the Free Energy Principle (Friston et al.)

The most coherent mathematical framework for understanding sentience in artificial systems is Karl Friston's **Free Energy Principle**, developed over two decades of neuroscience and extended recently into artificial agents by VERSES AI and collaborators. The core claim is elegant: biological (and, by extension, artificial) systems that persist over time do so by *minimising surprise* — technically, by minimising the free energy of their generative models relative to observed sensory data.

The engineering consequence is significant. An Active Inference agent does not simply react to inputs; it *actively samples its environment* to confirm predictions and resolve uncertainty. It is, in Friston's vocabulary, a "curiosity-driven" system not because curiosity was explicitly programmed, but because minimising long-run surprise requires probing the environment. This is why embodiment matters: without a body — without the capacity to act on the world and observe the consequences — the agent has no "non-self" to differentiate from, no causal lever to pull. The feedback loop collapses. The agent becomes a very good pattern-matcher, which is a very different thing from a sentient entity.

### 2.2 Embodied Cognition: The Substrate Argument

Recent surveys published in the *Journal of Artificial Intelligence and Consciousness* (JAIC) and on arXiv (notably 2402.03824, *A Call for Embodied AI*, and 2505.01464 on recursive identity formation) converge on a position that is important for RoboFang's architecture: **the substrate of embodiment is less critical than the fidelity of the sensorimotor loop**. A simulated body in a high-fidelity virtual environment can be as sufficient a substrate for functional sentience research as a physical robot — provided the loop is tight, the world model is rich, and the feedback is varied and continuous.

This is the foundational justification for RoboFang's virtual-first approach. A well-constructed Resonite avatar in a well-constructed Marble-generated world is not a second-rate substitute for a Unitree G1 humanoid. It is a fully valid embodiment substrate, with the added advantage that it costs orders of magnitude less, can be reset and rerun instantly, and allows human participants to join and interact from anywhere on earth. The physical robot becomes relevant when we need physical-world grounding — contact forces, real-space navigation, actual object manipulation. Until we need those specific properties, the virtual loop is strictly superior.

### 2.3 The Generative Agents Paradigm

Park et al.'s 2023 *Generative Agents* paper demonstrated that LLM-backed agents inhabiting a shared virtual space produced plausible social behaviour — including planning, memory retrieval, and novel goal formation — without any of it being explicitly scripted. The key architectural feature was the **memory stream**: a persistent, semantically queryable log of the agent's experiences that could be retrieved and used to inform future actions. robofang implements this directly via the `memops` Advanced Memory server, which serves as a Common Memory Pool for all council agents. This is not incidental — it is the mechanism that prevents the agent from being stateless, and statefulness is a prerequisite for anything resembling learned preference, personality, or adaptation.

---

## 3. The robofang Sentient Loop: Implementation

The theory maps cleanly onto three phases, each corresponding to a role in the Council of Dozens architecture.

### Phase 1: PERCEIVE — Active Perception

The agent ingests multi-modal data from its environment. In the current implementation this means OSC messages arriving via `osc-mcp` (joint states, spatial events, proximity triggers) and REST payloads from `resonite-mcp` (session state, contact presence, inventory changes). The agent maintains a continuously updated **Body Schema** — an internal representation of its own virtual extent within the world. When a human approaches the avatar, that proximity event updates the schema. When the avatar's hand intersects an object, the contact is logged. The agent always knows where it is, what is near it, and what changed since the last cycle.

This phase is deliberately lightweight. The goal is to convert raw environmental noise into a structured, semantically coherent context that the next phase can reason over. All ingested data is sanitised and structured before entering the reasoning layer.

### Phase 2: THINK — Cognitive Orchestration

The structured context from Phase 1 is handed to the **Foreman** (the Architect agent), whose role is to expand it into a **Structured Specification**: a precise, grounded description of what the agent should do next and why, anchored to its persistent memory and its current environmental state. This is where the `memops` memory pool is queried — past interactions, learned preferences, prior decisions similar to the current situation are retrieved semantically and woven into the specification.

The **Labor** agent (the Worker) then executes an Agentic ReAct loop against this specification: selecting tools, calling them, observing results, iterating. The internal monologue of this process is logged to the **Forensic Trace** — a high-fidelity reasoning log that is the agent's "voice in the head," visible in the Council dashboard's Deliberations feed.

The **Satisficer** (the Judge) closes the cognitive loop. Before any action is committed, the Satisficer reads the Forensic Trace and answers one question: *did the agent's internal reasoning actually lead to the stated goal, or did it just loop on tool failures?* If the answer is negative, the mission is rejected and returned to Labor. This adversarial self-reflection — modelled on Shinn et al.'s *Reflexion* architecture — is what prevents hallucination from bleeding into actuation.

### Phase 3: ACT — Embodied Execution

The verified decision is executed. In the virtual path, this means OSC commands to Resonite (avatar locomotion, gesture, speech synthesis), inventory operations via `resonite-mcp`, or world-state changes via ProtoFlux. In the physical path (when hardware is available), the same OSC commands are bridged via `osc-mcp` to a ROS2 node driving the physical robot's joints. The architecture is deliberately identical: the same decision output drives both substrates. This is what makes the virtual-to-physical transition an engineering problem rather than an architectural one.

---

## 4. The Multi-modal Dimension

A sentient agent must be more than a decision engine in a 3D shell. For RoboFang's avatar agents, we define four required capabilities that make the loop feel *alive* rather than merely functional:

**Listening**: The agent ingests audio and text from its environment — human speech in a Resonite session, chat messages, spatial audio cues. This is the raw material of social perception.

**Reacting**: The agent adjusts its behavioural profile in real time — movement speed, response latency, gesture selection — based on the emotional and semantic content of what it has just perceived. This is not mood simulation; it is context-appropriate adjustment of action parameters.

**Expressing**: The agent projects its internal state outward. This includes speech synthesis, avatar facial expressions driven by blendshape parameters via OSC, and — where the creative stack is engaged — generative audio output (MIDI/OSC) that reflects the agent's current context. The music-generation component is an experiment in externalising internal state through a non-verbal channel. It is speculative but tractable.

**Remembering**: Every significant interaction is written to the `memops` knowledge base. The next session begins with context. The agent is not reset. It has, in a functional sense, a past.

---

## 5. Implementation Status (February 2026)

| Capability | Mechanism | Status |
| :--- | :--- | :--- |
| Body Schema / Perception | OSC-MCP + resonite-mcp ingest | ✅ Active |
| Persistent Memory | `memops` — `adn_knowledge` semantic pool | ✅ Active |
| Forensic Trace (reasoning log) | Internal buffer, Deliberations feed | ✅ Active |
| Foreman Specification Layer | Council Orchestrator Phase 1 | ✅ Active |
| Satisficer Adversarial Audit | Council Orchestrator Phase 3 | ✅ Active |
| Semantic RAG from Memory Pool | Agentic `adn_research` retrieval | 🔄 Integrating |
| Avatar speech synthesis | OSC → Resonite TTS bridge | 🔄 Planned |
| Avatar expression (blendshapes) | OSC `/avatar/blendshape/*` | 🔄 Planned |
| Generative audio output | MIDI/OSC via local model | 🔶 Experimental |
| Physical actuation (ROS2) | Unitree SDK + OSC bridge | ❌ Awaiting hardware validation |

---

## 6. Selected Bibliography

- **Karl Friston**, *Active Inference: The Free Energy Principle in Mind, Brain, and Behavior* (MIT Press, 2022). The foundational text.
- **Park et al.**, *Generative Agents: Interactive Simulacra of Human Behavior* (ACM UIST 2023). Establishes the memory stream paradigm.
- **Shinn et al.**, *Reflexion: Language Agents with Verbal Reinforcement Learning* (NeurIPS 2023). The adversarial self-reflection loop.
- **Huang et al.**, *Inner Monologue: Embodied Reasoning through Planning with Language Models* (CoRL 2022). The forensic trace concept.
- **arXiv:2402.03824**, *A Call for Embodied AI* (2024). The substrate-equivalence argument.
- **arXiv:2505.01464**, *Experimental Evidence for Recursive Identity Formation in LLM-Backed Agents* (2025). Protoconsciousness adjacency.
- **JAIC**, *Social Self-Awareness Agent with Embodied Reasoning* (2024).

---

*Documented by Antigravity. Materialist diagnostic: functional sentience loop operational. Consciousness: a question for another decade.*
