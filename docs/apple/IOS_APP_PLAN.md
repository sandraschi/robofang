# RoboFang iOS App — Plan

**Goal:** Native iOS client for the RoboFang bridge: dashboard, council log stream, and light-touch control. Built with modern Xcode (e.g. 26.x) as an AI-assisted IDE so Swift/SwiftUI can be generated with minimal hand-written code.

---

## 1. Scope (MVP)

| Feature | Description | API / Notes |
|--------|-------------|-------------|
| **Health & status** | Show bridge and fleet health (up/down, MCP servers). | `GET /health`, `GET /v1/fleet/map` or equivalent |
| **Council / Operations log** | Live or pull-refresh stream of bridge + council deliberations. | `GET /logs` (ring buffer); ensure `[Council]` lines are in stream (see bridge logging) |
| **Run a skill** | Trigger a skill by id with user input (form → POST). | `POST /v1/skills/run` or bridge skill endpoint |
| **Settings** | Base URL for bridge (e.g. `http://goliath:10871`), optional auth if added later. | User-defined; store in UserDefaults or Keychain |

Out of scope for MVP: full tool execution UI, MCP discovery editor, installer flows, WebSocket push (optional later).

---

## 2. Platform & Tooling

- **Xcode:** 26.x (or latest stable). Use SwiftUI + async/await.
- **Minimum iOS:** 17+ (or per team policy).
- **Networking:** `URLSession`; for same-LAN or Tailscale, use `http://host:10871` (no HTTPS required in trusted LAN).
- **AI-assisted dev:** Use Xcode’s AI features to generate views and API client code; keep a small, consistent API client layer and document endpoints in this repo so prompts stay accurate.

---

## 3. Architecture (high level)

```
[SwiftUI Views]
       │
[ViewModels / ObservableObject]
       │
[BridgeAPI client]
       │  HTTP (URLSession)
       ▼
RoboFang Bridge (e.g. :10871)
```

- **BridgeAPI:** Single module or file: base URL + endpoints for health, logs, skills/run. Shared `Codable` types for responses.
- **State:** Use `@Observable` or `ObservableObject` for “current health”, “log lines”, “last skill result”. Prefer pull-to-refresh for logs unless you add WebSocket later.
- **Settings:** Persist base URL (and optional token) in UserDefaults; consider Keychain for any future token.

---

## 4. Key endpoints to implement

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Bridge liveness and optional fleet summary. |
| GET | `/logs` | Ring buffer of recent log entries (includes `[Council]` if extended logging is on). |
| GET | `/v1/fleet/map` or fleet status | Current MCP fleet state (if exposed). |
| POST | `/v1/skills/run` (or as defined in bridge) | Run skill by id + user input. |

Exact paths and response shapes must match `robofang` bridge implementation; keep this doc and the bridge API in sync.

---

## 5. UI sketch (MVP)

- **Tab 1 — Dashboard:** Health status (bridge + fleet), last refresh time, button to open Settings.
- **Tab 2 — Logs:** Scrollable list of log entries (timestamp, level, source, message); pull-to-refresh. Filter or highlight “Council” if desired.
- **Tab 3 — Skills:** List of available skills (if bridge exposes them) or a single “Run skill” form (skill id + input); show success/error and optional response.
- **Settings:** Text field for bridge base URL, save button.

Use system styling (dark/light) and standard SwiftUI components so the app stays maintainable by AI-assisted edits.

---

## 6. Security and environment

- **LAN / Tailscale:** Default to `http://` for local hostnames; avoid storing credentials in the app until the bridge requires them.
- **Certificate pinning:** Optional later if you expose the bridge over HTTPS; not required for MVP on trusted networks.
- **Secrets:** If the bridge gains API keys or tokens, use Keychain and never log them.

---

## 7. Doc and repo alignment

- **API reference:** Bridge endpoints and response shapes should be documented in `docs/API_REFERENCE.md` (or equivalent) so both bridge and iOS app stay aligned.
- **Build and run:** Add a short “Build and run” section to this doc or `docs/apple/README.md` once the app exists (e.g. open in Xcode, set team/signing, run on simulator or device).
- **RAG:** This plan and any architecture notes in `docs/apple/` are part of the RoboFang doc tree and will be ingested for RAG so the codebase and product context stay searchable.

---

## 8. Phases (suggested)

1. **Phase 1:** BridgeAPI client + Health + Logs (read-only dashboard).
2. **Phase 2:** Settings (base URL persistence) + Skills run (one skill, then list if available).
3. **Phase 3:** Polish (error handling, empty states, optional WebSocket for live logs) and doc updates.

---

## 9. References

- RoboFang bridge: `src/robofang/main.py`; logging and council stream: `src/robofang/core/orchestrator.py` (`_log_reasoning` → `[Council]` in bridge log).
- Tailscale/LAN: Set `ROBOFANG_BRIDGE_HOST=0.0.0.0` on the host so the bridge is reachable from the phone on the same network or Tailscale.
