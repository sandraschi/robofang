# Competitive landscape: RoboFang vs OpenClaw vs OpenFang vs OpenManus

Deep comparison for positioning, gap analysis, and roadmap. **Last reviewed:** 2026-03-28.

> Star counts change daily. OpenClaw is in the **hundreds of thousands** on GitHub (often cited ~200k–300k+ after repo renames). Stars measure **distribution and familiarity**, not fitness for robotics/fleet work.

---

## One-line identity

| Project | What it optimizes for |
|---------|------------------------|
| **OpenClaw** | “Talk to my agent anywhere” — messaging channels + plugins + Node runtime |
| **OpenFang** | “Run agents safely” — Rust agent OS, WASM sandbox, A2A/OFP protocols |
| **OpenManus** | “One agent, many tools” — Python CLI loop, browser/code/MCP client |
| **RoboFang** | “Orchestrate a fleet + embodiment” — MCP hub, council, robots/VR, local-first |

RoboFang is **not** trying to be a drop-in OpenClaw clone. It is a **composition layer** for many MCP servers and physical/virtual embodiment. OpenManus fits **beside** RoboFang (via `openmanus-mcp`), not instead of it.

---

## Feature matrix (honest)

| Capability | RoboFang | OpenClaw | OpenFang | OpenManus |
|------------|:--------:|:--------:|:--------:|:---------:|
| **Primary UX** | Hub SPA + MCP | Chat apps (20+ channels) | Desktop (Tauri) | CLI + optional UI |
| **Runtime** | Python 3.12, FastAPI | Node.js 22+ | Rust | Python 3.12 |
| **Local LLM default** | ✅ Ollama / LM Studio | ⚠️ Often cloud + Ollama option | ⚠️ Supported | ✅ Ollama in config |
| **Multi-model debate** | ✅ Council of Dozens | ⚠️ Sub-agents | ❌ Fan-out | ❌ Single loop |
| **MCP federation hub** | ✅ 30+ fleet servers | ⚠️ MCP tools via server | ⚠️ Client + server | ✅ MCP **client** |
| **Messaging breadth** | ⚠️ Some connectors | ✅ 20+ channels | ✅ Many adapters | ❌ Not focus |
| **Mobile story** | ⚠️ Browser + Tailscale | ✅ Native messaging UX | ⚠️ Desktop-first | ❌ CLI |
| **Plugin marketplace** | ⚠️ Manifest + hands | ✅ ClawHub | ✅ FangHub | ❌ PyPI/tools |
| **Security sandbox** | ⚠️ Logical + planned vendors | ⚠️ Allowlists | ✅ WASM / 16 layers | ⚠️ Docker optional |
| **A2A / OFP** | ❌ Not yet | ❌ | ✅ | ❌ |
| **Physical robotics** | ✅ Yahboom, Bumi, ROS paths | ❌ | ❌ | ❌ |
| **Virtual embodiment** | ✅ Resonite, VRChat, Unity | ❌ | ❌ | ❌ |
| **Browser automation** | Via fleet MCP | Via plugins | Via tools | ✅ Built-in Playwright |
| **GitHub stars (order of mag.)** | Low (niche infra) | **Very high** | Low–mid | Mid (FOSS agent) |

---

## Where each project wins

### OpenClaw

- **Onboarding:** one agent, one chat surface, huge docs and community.
- **Channels:** Telegram, Signal, WhatsApp, Slack, Matrix, etc. as product focus.
- **Plugins:** ClawHub-style discoverability and install narrative.
- **Social proof:** star count → contributors, battle-tested patterns.

### OpenFang

- **Security marketing:** WASM sandbox, taint tracking, Ed25519, many layers.
- **Performance:** single Rust binary, fast tool dispatch.
- **Protocols:** Google A2A, OpenFang Protocol (OFP).
- **Hands format:** `HAND.toml` ecosystem; RoboFang has `openfang_adapter.py`.

### OpenManus

- **Single-agent loop:** Manus agent with Python execute, browser, file edit, MCP fan-in.
- **Research credibility:** FoundationAgents / MetaGPT lineage, Zenodo artifact.
- **Fleet bridge:** `openmanus-mcp` exposes it to Cursor/fleet without merging repos.

### RoboFang

- **Embodiment:** only stack with serious physical + VR/Resonite as first-class story.
- **Fleet control plane:** index → install → operate many MCP repos without monorepo duplication.
- **Council:** adversarial multi-model path for hard decisions (when Ollama is up).
- **Economics:** local-first council at electricity cost, not per-token default.

---

## What RoboFang is missing (vs “what users know”)

These gaps explain star-count delta if the goal is **mass-market chat agent**:

1. **Chat-first default** — Users expect WhatsApp/Telegram/ChatGPT-style thread, not operator console + fleet deck.
2. **Happy path** — OpenClaw: install → pick channel → talk. RoboFang: ports, manifest, fleet, bridge.
3. **Channel breadth** — Telegram/Signal as first-class, not only Discord/Slack/email paths.
4. **Plugin store UX** — One-click “add capability” without git clone literacy.
5. **Native mobile** — PWA + Tailscale helps; not same as messaging-native mobile.
6. **A2A/OFP** — If interop with OpenFang/Google agent mesh matters.
7. **Single-agent browser loop** — OpenManus ships Playwright in-box; RoboFang delegates to fleet MCPs.

RoboFang is **not** missing its wedge if the user is a **fleet operator / maker / robotics** persona — only if the persona is **“I want OpenClaw but local.”**

---

## Easy wins (bounded effort, high leverage)

| Priority | Item | Effort | Notes |
|:--:|------|--------|-------|
| 1 | **Chat-first hub UI** | Days | Bubble thread, composer, Council toggle — see [CHAT_UX.md](./CHAT_UX.md) |
| 2 | **Starter fleet packs** | Hours | Curated `fleet_manifest` bundles + README (“media”, “dev”, “robotics”) |
| 3 | **PWA + mobile CSS** | Days | `manifest.json`, safe-area, chat layout on phone via Tailscale |
| 4 | **One new channel** | Days–week | e.g. Telegram bot hand following existing connector pattern |
| 5 | **OpenManus story in docs** | Hours | “Orchestrate via RoboFang; run Manus-class tasks via openmanus-mcp” |
| 6 | **ClawHub manifest adapter** | Weeks | Import subset of plugin metadata → hand manifest (no Node runtime) |
| 7 | **A2A read-only bridge** | Weeks | Stub client for interop, not full OpenFang parity |
| 8 | **2-minute demo video** | Hours | Chat + one embodiment path — stars follow clarity |

---

## Recommended next focus (maintainer view)

**Now (Q2 2026):**

1. **Chat UX** — Make the hub feel like OpenClaw/OpenAI chat; fleet/audit become secondary tabs.
2. **Honest capabilities** — Keep “coming soon” for DefenseClaw/OpenShell/Bastio ([SECURITY_INTEGRATIONS.md](./SECURITY_INTEGRATIONS.md)).
3. **Starter pack + install doc** — One command to bridge + chat + one hand.

**Next:**

4. ReAct/tool-use migration (native Ollama chat tools) — reduces council XML fragility.
5. Telegram or Signal bridge — biggest “users know this” gap after chat UI.
6. Semantic memory via `advanced-memory-mcp` in default ask path.

**Later:**

7. A2A/OFP peer mode with OpenFang.
8. ClawHub-compatible import path.
9. Vendor sidecars (DefenseClaw patterns) when evaluation completes.

Full phased list: [ROADMAP.md](./ROADMAP.md), [NEXT_PRIORITIES.md](./NEXT_PRIORITIES.md).

---

## Integration map (don’t duplicate)

```text
User phone / desktop
    │
    ├─ OpenClaw-style chat ──► RoboFang Hub SPA (chat) ──► POST /api/hands/ask
    │                              │
    │                              ├─ Council / RAG / orchestrator
    │                              └─ MCP fleet (plex, blender, yahboom, …)
    │
    ├─ OpenManus-class task ──► openmanus-mcp (fleet node) ──► OpenManus CLI
    │
    └─ OpenFang Hand ──► openfang_adapter ──► local MCP tool surface
```

---

## References

| Doc | Purpose |
|-----|---------|
| [COMPETITION.md](./COMPETITION.md) | Short positioning summary |
| [CHAT_UX.md](./CHAT_UX.md) | Chat-first frontend plan |
| [NEXT_PRIORITIES.md](./NEXT_PRIORITIES.md) | Ordered backlog |
| [SECURITY_INTEGRATIONS.md](./SECURITY_INTEGRATIONS.md) | Vendor stack honesty |
| [CONTROL_PLANE.md](./CONTROL_PLANE.md) | Fleet vs duplication |
| MCP Central | `projects/robofang/COMPETITIVE_ANALYSIS.md`, `integrations/openmanus.md` |

---

## Change log

- **2026-03-28:** Initial deep compare (4-way), gaps, easy wins, maintainer priorities.
