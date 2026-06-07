# Next priorities (maintainer backlog)

Ordered recommendations after competitive review (OpenClaw / OpenFang / OpenManus). See [COMPETITIVE_LANDSCAPE.md](./COMPETITIVE_LANDSCAPE.md) for full analysis.

**Principle:** Strengthen **what users already understand** (chat) without pretending unfinished integrations are live.

---

## P0 — Chat-first hub (in progress)

| Item | Status | Acceptance |
|------|--------|------------|
| Bubble chat thread (user / assistant) | ✅ Shipped | Main view is conversation |
| Composer with Council + RAG toggles | ✅ Shipped | `POST /api/hands/ask` |
| Separate system activity from chat | ✅ Shipped | Health strip collapsible; no console in thread |
| Nav label **Chat** | ✅ Shipped | Sidebar matches familiar chat apps |

Details: [CHAT_UX.md](./CHAT_UX.md). Remaining: **streaming**, **session persistence**, **PWA**.

---

## P1 — Onboarding (days)

- [ ] **Starter fleet packs** in `fleet_manifest.yaml` + doc (“Dev”, “Media”, “Robotics”).
- [ ] **Single start story** in `INSTALLATION.md`: bridge up → open chat URL → first prompt.
- [ ] **PWA** `manifest.json` + icons for “Add to Home Screen” on phone (Tailscale).

---

## P2 — Parity hooks (weeks)

- [ ] **Telegram** (or Signal) bot connector as a hand — highest channel gap vs OpenClaw.
- [ ] **OpenManus peer doc** in README: use `openmanus-mcp` for Manus-class loops; RoboFang orchestrates.
- [ ] **Streaming responses** (SSE) for ask — chat feels responsive vs single blocking POST.
- [ ] **Session persistence** — localStorage or bridge session id for chat history across refresh.

---

## P3 — Depth (months)

- [ ] Native Ollama `/api/chat` tool-use (ReAct migration) — [ROADMAP.md](./ROADMAP.md) Phase 3.
- [ ] A2A/OFP bridge (read-only first) for OpenFang interop.
- [ ] ClawHub manifest → hand import adapter (no Node runtime in bridge).
- [ ] DefenseClaw / OpenShell / Bastio — only after evaluation; see [SECURITY_INTEGRATIONS.md](./SECURITY_INTEGRATIONS.md).

---

## Explicit non-goals (for now)

- Replacing OpenClaw as a messaging monolith inside one repo.
- Claiming WASM-level sandbox parity with OpenFang without shipping it.
- Merging OpenManus source into `robofang/` (use fleet node instead).

---

## Change log

- **2026-03-28:** Created from competitive landscape review.
