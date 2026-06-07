# Comparison: RoboFang vs competitors (summary)

Short positioning. **Full analysis:** [COMPETITIVE_LANDSCAPE.md](./COMPETITIVE_LANDSCAPE.md) (OpenClaw, OpenFang, OpenManus, gaps, easy wins).

---

## Focus

| Project | Optimizes for |
|---------|----------------|
| **OpenClaw** | Messaging + plugins (hundreds of thousands of GitHub stars) |
| **OpenFang** | Rust agent OS, security, A2A/OFP |
| **OpenManus** | Single CLI agent + browser/code tools (fleet: `openmanus-mcp`) |
| **RoboFang** | MCP fleet hub + embodiment + local council |

---

## Where RoboFang wins

- **Physical + virtual robotics** (Yahboom, Bumi, Resonite, VRChat) — others don’t compete here.
- **Federated MCP fleet** — orchestrate many specialized servers without vendoring them into one repo.
- **Council of Dozens** — multi-model synthesis for hard decisions (local Ollama).
- **Local-first economics** — research loops without per-token cloud default.

---

## Where others win (gaps we acknowledge)

- **OpenClaw:** channels, ClawHub, mobile-native chat familiarity, community scale.
- **OpenFang:** WASM sandbox, A2A/OFP, desktop app polish.
- **OpenManus:** in-box browser/code agent loop; we **integrate** via `openmanus-mcp`, not duplicate.

---

## UX direction

Users know **chat apps**. The hub is moving **chat-first** — see [CHAT_UX.md](./CHAT_UX.md) and [NEXT_PRIORITIES.md](./NEXT_PRIORITIES.md).

---

## Related

- [ROADMAP.md](./ROADMAP.md)
- [SECURITY_INTEGRATIONS.md](./SECURITY_INTEGRATIONS.md)
