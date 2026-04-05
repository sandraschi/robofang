# PRD: RoboFang Sovereign Orchestration Hub

**Status**: ACTIVE DRAFT (Phase 5 — Embodiment + World Models)
**Owner**: Sandra Schipal
**Last revised**: 2026-04-04
**Version**: pyproject 0.3.x / CHANGELOG ~12.6
**Vision**: A sovereign, reductionist orchestration hub for a federated fleet of MCP servers — combining adversarial multi-agent synthesis, local-first inference, and grounded embodiment across virtual and physical substrates.

---

## 1. Executive Summary

RoboFang is the nervous system for a distributed fleet of AI-driven tools. Its primary architecture is **Active Synthesis through Structured Adversariality**: a Council of specialised agents that perceive, debate, and converge on executable plans — with the entire inference path running on local hardware at zero per-token cost.

The project sits at a deliberate intersection of engineering and neurophilosophy. The Council's architecture — perceive, think, act, audit — is a structural imitation of the mammalian sensorimotor loop, as formalised by Karl Friston's Free Energy Principle. The practical claim is modest and falsifiable: an agent with a persistent memory substrate, a rich sensorimotor interface, and an adversarial self-reflection layer will produce demonstrably more coherent and explainable behaviour than a stateless tool-caller. We are measuring the results.

What distinguishes robofang from every general-purpose orchestration framework is the intersection of three properties that no competitor currently combines:

1. **Adversarial Council synthesis** — not workflow fan-out, but genuine multi-agent debate with tiebreaker and audit trail
2. **Grounded embodiment** — virtual (Resonite/OSC) and physical (Yahboom/Bumi/Unitree) substrates with the same agent interface
3. **World-model-grounded planning** — LeWorldModel (JEPA/arXiv:2603.19312) available as a council tool, enabling plans grounded in learned world dynamics rather than pure LLM prior

> **Positioning statement**: Sovereign orchestration hub for local AI + physical and virtual embodiment on custom hardware, with a domain-specific MCP fleet and adversarial Council synthesis that no general-purpose framework replicates.

---

## 2. Core Pillars

### Pillar I: Federated Orchestration (Fleet Management)

RoboFang maintains a live capability graph of the entire Sandra-class MCP fleet — 135 repositories spanning robotics, 3D tooling, social VR, security, memory, and media systems. The fleet indexer performs continuous discovery across `D:/Dev/repos`, extracting tool schemas, port bindings, and health signals. The result is a queryable semantic index: what every server can do, what it currently is doing, and whether it is healthy.

**Current state**: Federation map is live. Bridge proxies 20+ active connectors. Fleet installer catalog allows install → register → launch in a single flow.

**Phase 5 target**: Dynamic capability schema per connector (from `get_capabilities()` ABC implementation), so council agents can discover and call any fleet tool by schema rather than by hardcoded bridge logic.

### Pillar II: The Council of Dozens (Active Synthesis)

The Council is the arbitration layer for complex, multi-step tasks. Each council member is a specialised agent with a defined role, curated tool bridges, and a Pydantic-typed result schema.

**Roles**:
- **Foreman**: Architectures the execution plan from the raw specification. Signs the plan (target: cryptographic signature for Bastio verification).
- **Labor**: Executes tool-use loops via Ollama native `/api/chat` tools API with sliding-window conversation history.
- **Satisficer**: Audits the outcome against the original specification.
- **Adjudicator**: Synthesises a corrected plan from the debate record when Labor and Satisficer disagree.
- **Instigator**: Adversarial red-team role — surfaces failure modes before execution.
- **Architect**: System design lens — validates that proposed plans are structurally coherent.

**Current state**: 3-phase flow (Enrich/Execute/Audit) is implemented. Benchmark data in `data/benchmarks/` confirms active use. Ollama native tool-use refactor in progress ([12.6.0]).

**Phase 5 target**: Full conversation history management with token budget, per-role prompts in `configs/`, end-to-end integration test, and Foreman spec signing.

**Primary inference model (as of April 2026)**: Qwen3.5 27B (Q4_K_M, ~20GB VRAM, 128K context, reliable tool-calling). Fast roles: Qwen3.5 9B or Qwen3.5 35B-A3B (MoE, 112 t/s). Cloud fallback: Gemini 2.0 Flash for multimodal and frontier-gap tasks.

### Pillar III: Sovereign Control (UI/UX)

The Sovereign Dashboard (port 10864 / `robofang-hub/`) is the primary human control surface. It surfaces:
- **Deliberations feed**: real-time Forensic Trace transcript of council reasoning
- **Fleet health**: live status for all registered MCP servers
- **Active sessions**: council round status, Resonite session state
- **Safety heartbeats**: Bastion resource monitors, Bastio gate status
- **Posture/Integrations hub**: roadmap visibility with "Coming Soon" badges

**Current state**: React + Vite + shadcn/ui on port 10864, live. Connector cards with status + webapp launch buttons.

**Phase 5 target**: Surface `ROBOFANG_AUTO_LAUNCH_CONNECTORS` as a toggle. Add Prometheus metrics dashboard panel. Connect deliberations feed to memops knowledge graph for cross-session search.

### Pillar IV: Simulation Layer (Embodiment Substrate)

The simulation pipeline is the substrate through which council agents interact with a world. It has two complementary execution paths:

**World Generation** — `worldlabs-mcp` → World Labs Marble API → SPZ (visual) + GLB (collision) → `blender-mcp` or `unity3d-mcp` → Resonite headless deployment. Produces navigable, human-joinable 3D environments under council orchestration.

**Virtual Embodiment** — `resonite-mcp` + `osc-mcp` + `lewm-mcp` (NEW). A robot avatar is spawned, joint states published at 30 Hz via OSC ProtoFlux listeners, and human interactions fed back as perception events. LeWorldModel provides a learned world model that the Council can query during planning — enabling plans grounded in world dynamics rather than pure LLM priors.

**Physical Embodiment** (roadmap, Virtual-First Gate applies):
- **Yahboom Raspbot v2** (active): ROS2 patrol + speech loop, hands/yahboom-mcp
- **Noetix Bumi** (planned): ROS2 quadruped, bumi-mcp at 10774/10775, Sim2Real research
- **Unitree G1** (long-term): full humanoid, dependent on virtual validation results

**Virtual-First Policy**: No physical hardware purchase is authorised until a virtual equivalent has passed 48 hours of adversarial HRI testing in Resonite. This is a hard policy gate, not a preference.

### Pillar V: Local Inference (Sovereign AI)

The inference layer runs cost-sovereign on RTX 4090 (24GB GDDR6X). All council operations, memory retrieval, and adversarial auditing run locally. Cloud APIs are reserved for frontier capability gaps.

**Model tier config** (`configs/llm_model_tiers.json`):
```json
{
  "council_reasoning": "qwen3.5:27b",
  "fast_drafts_and_satisficer": "qwen3.5:35b-a3b",
  "lightweight_routing": "qwen3.5:9b",
  "multimodal": "cloud:gemini-2.0-flash",
  "code_specialist": "qwen3-coder-next:9b"
}
```

**Integration**: `local-llm-mcp` proxies all backends into the council tool mesh. Model selection is task-routed by the orchestrator; the inference backend is swappable without touching agent code.

**Cost target**: Council operations ≤ €0.01/session. Cloud spend ≤ €20/month under normal research load.

### Pillar VI: World-Model-Grounded Planning (NEW)

**LeWorldModel** (`lewm-mcp`, ports 10927/10928) is a JEPA-based world model (arXiv:2603.19312) for embodied agents. It learns compact representations of world dynamics from observations and can predict forward states given a planned action sequence.

**Integration path**:
1. Resonite session captures visual + OSC state observations → forwarded to lewm-mcp
2. Council Foreman can call `lewm_predict(current_state, planned_actions)` to evaluate a plan before execution
3. Satisficer compares predicted vs. observed outcome as part of the audit
4. Over time, the world model improves from accumulated session data

This closes the loop between planning and world-grounded verification — a pattern with no equivalent in any current general-purpose orchestration framework.

---

## 3. Technical Requirements

### Backend Stack

- **FastMCP 3.1+** — dual transport (stdio + HTTP), sampling, portmanteau, `ctx.sample()` meta-tool pattern
- **Ollama** (primary inference) — `/api/chat` with native `tools` parameter and conversation history management
- **LanceDB** — semantic RAG for media databases and knowledge retrieval
- **advanced-memory-mcp** — persistent knowledge graph substrate; every significant council decision written via memops
- **pywinauto** — legacy UI automation for desktop applications without API interfaces
- **FastAPI + uvicorn** — bridge HTTP surface

### Inference Stack (April 2026)

| Role | Model | VRAM | Notes |
|------|-------|------|-------|
| Council reasoning | Qwen3.5 27B Q4_K_M | ~20GB | Reliable tool-calling, 128K ctx |
| Fast / Satisficer | Qwen3.5 35B-A3B | ~12GB | MoE, 112 t/s on RTX 3090 |
| Routing / triage | Qwen3.5 9B | ~6GB | Low latency |
| Code specialist | Qwen3-Coder-Next 9B | ~6GB | SWE-bench optimised |
| Cloud fallback | Gemini 2.0 Flash | — | Multimodal, frontier gaps |

### Embodiment Stack

```
worldlabs-mcp → Marble API → SPZ + GLB
    ↓
blender-mcp / unity3d-mcp (asset processing)
    ↓
resonite-mcp → Resonite headless session
    ↓
osc-mcp → ProtoFlux joint listeners (30 Hz)
    ↑↓
lewm-mcp → world model inference (JEPA)
    ↑
Council Foreman (planning queries to lewm)
```

Physical path: `yahboom-mcp` (active) / `bumi-mcp` (planned) via ROS2 bridge.

### Security Stack

- **Bastio**: Input validation gate — validates intent before action
- **DefenseClaw**: Action sandboxing — restricts what Labor agents can execute
- **Bastion**: CPU/RAM quota monitor
- **DTU (Dark Twin Universe)**: Filesystem shadow proxy for pre-flight audit of file modifications
- **Target**: Foreman spec signing (Ed25519) so only verified plans reach Labor

### Monitoring Stack

- Prometheus + Grafana + Loki + Promtail (Docker Compose in `infra/`)
- **Gap**: Bridge has no `/metrics` endpoint — `prometheus-fastapi-instrumentator` needed
- Target: every council session, connector call, and security gate event emitting structured metrics

### Frontend Stack

React + Vite + TypeScript + shadcn/ui + Tailwind. Port 10864 (hub), port 10865 (bridge). Glassmorphism dark theme, micro-animations, zero runt designs.

---

## 4. New Concepts to Integrate

### 4.1 Sliding-Window Conversation History

Each council Labor loop should maintain a typed conversation history with an explicit token budget. This prevents unbounded prompt growth and enables coherent multi-step tool-use chains.

```python
class ConversationManager:
    def __init__(self, max_tokens: int = 16000):
        self.max_tokens = max_tokens
        self.messages: list[dict] = []

    def add(self, message: dict) -> None:
        self.messages.append(message)
        self._trim()

    def _trim(self) -> None:
        # Always keep system + last N exchange pairs
        if self._estimate_tokens() > self.max_tokens:
            system = [m for m in self.messages if m["role"] == "system"]
            rest = [m for m in self.messages if m["role"] != "system"]
            self.messages = system + rest[-20:]  # last 10 exchange pairs
```

### 4.2 Per-Role Council Prompts

Currently a single `council_debate_prompt.md` drives all roles. Phase 5 target: one prompt file per role in `configs/council_roles/`, loaded by the orchestrator at session start. This enables independent tuning of Foreman (architectural thinking), Satisficer (adversarial auditing), and Adjudicator (synthesis from disagreement) without coupling.

### 4.3 Foreman Spec Signing

The Foreman produces an execution plan (spec). Before Labor executes it, Bastio should verify the spec is signed by a known Foreman identity. Implementation:

```python
import hashlib, hmac

def sign_spec(spec: dict, secret: bytes) -> str:
    payload = json.dumps(spec, sort_keys=True).encode()
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()

def verify_spec(spec: dict, signature: str, secret: bytes) -> bool:
    expected = sign_spec(spec, secret)
    return hmac.compare_digest(expected, signature)
```

This is the minimum viable spec integrity check before moving to Ed25519.

### 4.4 LeWorldModel Planning Integration

The council Foreman should be able to call `lewm_predict()` as a planning tool before committing to an execution plan. The integration is:

1. Foreman generates candidate plan
2. Calls `lewm_predict(current_state, plan_steps)` to get predicted outcome state
3. Evaluates predicted outcome against specification
4. Either commits the plan or revises based on predicted failure

This makes planning grounded in world dynamics rather than pure linguistic reasoning.

### 4.5 Structured Tool Schema per Connector

The `BaseConnector` ABC should require `get_capabilities() -> ToolSchema` so the orchestrator's `_build_tool_bridge()` can pass accurate JSON schema to the Ollama tools parameter. Without this, the LLM guesses parameter names and types.

```python
class BaseConnector(ABC):
    @abstractmethod
    def get_capabilities(self) -> list[dict]:
        """Return JSON schema list for this connector's tools."""
        ...

    @abstractmethod
    async def ping(self) -> bool:
        """Liveness check."""
        ...
```

### 4.6 Memops Integration in Council Loop

Every council session should write to the knowledge graph:
- Session start: task description, participating models, tool bridge schema
- Each Labor step: tool called, arguments, result, latency
- Adjudication: disagreement summary, resolution
- Session end: final output, quality signal (Satisficer score)

This builds the longitudinal dataset for sentience validation metrics — the "demonstrably more coherent" claim in the PRD must be backed by data.

---

## 5. Phase Roadmap

### Phase 4 (Complete / In-Flight)

- ✅ Three-process topology (Bridge/Supervisor/Hub)
- ✅ Federation map as single source of truth
- ✅ FastMCP 3.1 unified gateway
- ✅ Council 3-phase flow (Enrich/Execute/Audit)
- ✅ Bastio + DefenseClaw security moat
- ✅ Yahboom physical robotics + speech loop
- ✅ Bumi-mcp integration (ports documented)
- ✅ Single-command launch (start_all.ps1)
- 🔄 Ollama native tool-use ReAct rewrite (in progress per [12.6.0])

### Phase 5 (Current — April to June 2026)

- [ ] Complete and verify ReAct rewrite with conversation history management
- [ ] Per-role council prompts
- [ ] Foreman spec signing (HMAC minimum)
- [ ] Connector `get_capabilities()` ABC + wiring to tool bridge
- [ ] Model tier update (Qwen3.5 as primary council model)
- [ ] LeWorldModel planning integration doc + prototype
- [ ] Memops council session writes
- [ ] End-to-end council integration test
- [ ] Prometheus `/metrics` endpoint
- [ ] Fleet manifest ownership document
- [ ] Version number unification

### Phase 6 (Q3 2026 — Sim2Real)

- [ ] Bumi Sim2Real: 48h adversarial Resonite HRI gate
- [ ] Bumi physical deployment with council orchestration
- [ ] LeWorldModel accumulated session training loop
- [ ] iOS companion app (docs/apple/IOS_APP_PLAN.md)
- [ ] Bastio Ed25519 spec signing

### Phase 7 (Q4 2026 / 2027 — Unitree horizon)

- [ ] Unitree G1 virtual embodiment in Resonite
- [ ] 48h HRI gate for G1 avatar
- [ ] Hardware acquisition decision (based on gate results)
- [ ] SLAM + Gazebo physics simulation integration

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Council synthesis speed | < 10s round-trip | Forensic Trace timestamps |
| Fleet availability | 99.9% connector visibility | Prometheus uptime |
| Inference cost | ≤ €0.01/session council | Token count × cost model |
| Cloud spend | ≤ €20/month | Billing dashboard |
| HRI coherence improvement | Measurable across successive sessions | Satisficer scores in memops |
| Virtual-First gate | 48h adversarial HRI before hardware | Hard policy enforcement |
| Dashboard quality | Zero runt designs | Visual audit |
| Council test coverage | End-to-end test passing | CI |

---

## 7. What Robofang Is Not

- Not competing with OpenFang on channel adapter count or Rust binary size
- Not an "Agent OS" (no kernel-level resource management — that framing is marketing copy)
- Not cloud-first (cloud is fallback for frontier gaps only)
- Not general-purpose (the custom fleet is the point, not a limitation)
- Not hardware-first (Virtual-First Policy is not negotiable)

---

*PRD last revised 2026-04-04. Previous version archived in PRD.md.*
