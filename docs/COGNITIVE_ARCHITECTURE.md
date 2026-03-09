# 🧠 robofang v2.0: Cognitive Architecture & Forensic Mirroring

> [!IMPORTANT]
> This document defines the advanced cognitive layers of the robofang "Dark Integration" architecture, bridging the gap between raw tool execution and autonomous self-reflection.

## 1. The Semantic Memory Pool (Infinite Context)

robofang leverages the `memops` MCP server as a **Common Memory Pool**. This acts as a Retrieval-Augmented Generation (RAG) substrate for the entire Council.

- **Semantic Querying**: Agents do not just rely on conversation history. They perform semantic searches against the `memops` knowledge base to retrieve similar past implementation patterns, user preferences, and project-specific "lessons learned".
- **Agentic RAG**: Unlike static RAG, robofang agents autonomously decide *when* to query the pool and *how* to refine the context before execution.
- **Research Anchor**: 
  - *Generative Agents: Interactive Simulacra of Human Behavior* (Park et al., 2023) - Introduces the "Memory Stream" concept.
  - *MA-RAG: Multi-Agent Retrieval-Augmented Generation* (2024) - Orchestration of collaborative agents for retrieval.

## 2. "Voice in the Head" (The Forensic Trace)

The "Voice in the Head" is implemented as the **Forensic Trace** (Reasoning Log).

- **Internal Monologue**: Every agentic decision, tool thought, and observation is captured in a high-fidelity internal buffer.
- **Transparency**: This is the "inner voice" that the user sees in the dashboard's Deliberations feed.
- **Cognitive Decoupling**: By logging thoughts separately from output, we prevent "hallucination leak" where the agent's internal confusion might otherwise bleed into the final code.
- **Research Anchor**:
  - *Inner Monologue: Embodied Reasoning through Planning with Language Models* (Huang et al., 2022) - Formalizes the use of natural language for internal agent planning.

## 3. "Looking in the Mirror" (The Forensic Mirror)

"Looking in the Mirror" is the primary function of **The Satisficer** role in the Dark Integration flow.

- **Self-Reflection**: Before mission completion, the Satisficer (as the adversarial judge) "looks back" at the Forensic Trace. 
- **The Mirror**: The agent observes its own internal reasoning process from an external perspective. It asks: *"Did my internal logic actually lead to the goal, or did I just loop on tool failures?"*
- **Recursive Correction**: If the mirror reveals a mismatch, the mission is rejected and sent back to Phase 2 (Execute) for correction.
- **Research Anchor**:
  - *Reflexion: Language Agents with Iterative Self-Reflection and Learning* (Shinn et al., 2023) - Introduces the iterative self-loop for agentic correction.
  - *MIRROR: Modular Internal Reasoning, Reflection, Orchestration, and Response* (2024) - A cognitive architecture for active internal refinement.

## 4. Implementation Status (v2.0)

| Concept | robofang v2.0 Implementation | Status |
| :--- | :--- | :--- |
| **Memory Pool** | `memops` semantic bridge + `adn_knowledge` | ✅ ACTIVE |
| **Voice in Head** | High-fidelity internal `ForensicTrace` buffer | ✅ ACTIVE |
| **Mirror** | Satisficer-led Adversarial Audit phase | ✅ ACTIVE |
| **Semantic RAG** | Agentic tool-use logic for knowledge retrieval | 🔄 INTEGRATING |

---

*Phase 3: Final Verification will demonstrate the "Forensic Mirror" in action during the adversarial audit loop.*
