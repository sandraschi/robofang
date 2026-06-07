# Chat-first hub UX

RoboFang’s **fleet orchestrator** is powerful but unfamiliar. Most users know **chat apps** (OpenClaw, ChatGPT, Telegram bots). The hub webapp should lead with **conversation**, not an operator console.

**Location:** `robofang-mcp/webapp/frontend/` (Vite, port **10760** dev; production served with bridge).

---

## Design goals

1. **Primary surface = chat thread** — user bubbles left/right or user/assistant pattern like familiar messengers.
2. **Composer always visible** — sticky bottom bar; Enter to send; Shift+Enter for newline (future).
3. **Power features are toggles, not walls** — Council and RAG as switches, not separate apps.
4. **Fleet & audit stay available** — secondary nav; don’t hide capability, don’t lead with it.
5. **Honest empty states** — if bridge is down, say so in chat; no fake assistant replies.

---

## What ships today

| Feature | Status |
|---------|--------|
| Chat bubble UI (`ChatThread`) | ✅ |
| Composer + send (`ChatComposer`) | ✅ |
| Council / RAG toggles → API | ✅ |
| Collapsible bridge status strip | ✅ |
| `POST /api/hands/ask` | ✅ |
| Streaming tokens | ❌ Coming soon |
| Session history on server | ❌ Client session only (refresh clears unless extended) |
| Channel bridges (Telegram, etc.) | ❌ Roadmap — not in SPA |

---

## API contract (chat)

```http
POST /api/hands/ask
Content-Type: application/json

{
  "prompt": "user message",
  "use_council": false,
  "use_rag": true
}
```

Response (success):

```json
{
  "success": true,
  "response": "assistant text",
  "message": "assistant text",
  "model": "llama3.2:3b"
}
```

Errors return `success: false` and `error` — show in assistant bubble or inline error state, not a fake success.

---

## Layout (chat view)

```text
┌─────────────────────────────────────────┐
│  Chat                          [status] │
├─────────────────────────────────────────┤
│                                         │
│     [assistant welcome / bubbles]       │
│                    [user bubble] ──►  │
│  ◄── [assistant bubble]                 │
│                                         │
├─────────────────────────────────────────┤
│ [Council ☐] [RAG ☑]  [ input … ] [Send] │
└─────────────────────────────────────────┘
```

Compact status (bridge UP, N fleet nodes) — collapsible strip above composer or sidebar footer.

---

## Roadmap (chat)

| Phase | Item |
|-------|------|
| **A** (now) | Bubble UI, toggles, separate activity log from messages |
| **B** | SSE streaming for partial assistant text |
| **C** | `session_id` + server-side history; export thread |
| **D** | Suggested prompts / slash commands (`/fleet`, `/council`) |
| **E** | Mobile PWA + safe-area; optional Telegram as **channel**, not replacement for web chat |

---

## Comparison to OpenClaw UX

| OpenClaw | RoboFang hub (target) |
|----------|------------------------|
| Message in Telegram | Message in web chat (Tailscale on phone) |
| Plugin from ClawHub | Install hand from fleet manifest |
| Single agent persona | Council toggle for hard questions |
| Cloud API default | Local Ollama default (bridge config) |

We **borrow the interaction model**, not the Node runtime or channel stack.

---

## Related

- [COMPETITIVE_LANDSCAPE.md](./COMPETITIVE_LANDSCAPE.md)
- [NEXT_PRIORITIES.md](./NEXT_PRIORITIES.md)
- [WEBAPP_PORTS.md](./standards/WEBAPP_PORTS.md)
