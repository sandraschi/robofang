# Hub UX for research-style tasks

Does the RoboFang MCP webapp (hub) give a good page for **giving requests**, **following progress**, and **getting the result**—especially for research tasks? Short status and what’s easily doable.

---

## What exists today

| Need | Current support |
|------|------------------|
| **Give a request** | **Chat** (`/chat`): text input, send. Single-agent or Council toggle. Timeouts 1 min (single) / 3 min (council). Good enough to submit. |
| **Follow progress** | **Deliberations** (`/deliberations`): polls `GET /deliberations` every 5s, shows reasoning log (agent, type, content). **But** the orchestrator only pushes to that log during **process_mission** (Foreman/Worker/Satisficer) and **council adjudication** (sensitive tools). The normal **ask** path (single or council_synthesis) does **not** write to the reasoning log, so for a typical Chat request you see no live steps. |
| **Get the result** | **Chat**: final message appears in the thread (model + difficulty badge). No export, no permalink, no persistent history (in-memory only). |

**Timeline** (`/timeline`): UI exists for “orchestration timeline” but uses **mock data**; not wired to the bridge.

So: **submitting** and **seeing the final answer** work. **Following progress** for a normal ask did not—Deliberations was not filled for standard Chat requests (see **Implemented** below).

---

## Implemented: live reasoning in Chat

- **Backend** (`orchestrator.ask()`): `_log_reasoning("Ask", "thought", ...)` is now called: (1) after difficulty assessment (“Ask started — difficulty X, council=…”), (2) after RAG when context is retrieved (“RAG context retrieved.”), (3) before council (“Council synthesizing (multiple models).”), (4) before single-agent (“Reasoning (single agent).”). So every ask produces entries in the reasoning log.
- **Frontend** (Chat): While `sending === true`, the page polls `GET /deliberations` every 2.5s and shows a **Live reasoning** strip (last 8 steps) above the input. When the request finishes, polling stops and the strip clears. Users see “Ask started” → “RAG context retrieved” (if RAG) → “Council synthesizing” or “Reasoning (single agent)” while waiting.

---

## Gaps for “research tasks”

Research-style use often means:

- One-shot or multi-step question (“summarize X”, “compare A and B”, “find papers and draft an outline”).
- Desire to see **what’s happening** while it runs (e.g. “RAG retrieval…”, “Council synthesizing…”, “Done”).
- Optional: **long-running** jobs (submit → leave → come back to result).

Current gaps:

1. **No per-request progress** – Chat shows a single “…” until the full response; no step-by-step feedback.
2. **Reasoning log not tied to ask** – Deliberations doesn’t show steps for the request you just sent unless you triggered a mission or adjudication.
3. **No streaming** – `/ask` returns only when done; no token or chunk stream.
4. **No task queue** – No “submit → task id → poll status → get result” for background research.

---

## Easily doable improvements

These are small changes that would make the hub much better for research-style use.

### 1. Show progress during Chat (deliberations + small backend change)

- **Backend**: In `orchestrator.ask()`, add a few `_log_reasoning(...)` calls, e.g.  
  - after RAG: “RAG context retrieved.”  
  - before council: “Council synthesizing (N models).”  
  - before single-model: “Reasoning (single agent).”  
  So the reasoning log has entries for **every** ask, not only missions.
- **Frontend**: On Chat, when `sending === true`, **poll** `GET /deliberations?limit=10` every 2–3s and show a compact “Live reasoning” strip above or below the input (last few steps). When the request completes, stop polling and show the final message as today.

Result: user sends a research question and sees “RAG context retrieved” → “Council synthesizing (3 models)” (or “Reasoning (single agent)”) while waiting, then the answer. No new API; reuses existing Deliberations.

### 2. Optional: streaming `/ask`

- Backend: If the reasoning engine (Ollama/LM Studio) supports streaming, add a `stream: true` path that yields SSE or chunked JSON (e.g. token deltas or “step” events).
- Frontend: Consume the stream and append to the assistant message in real time.

Larger change than (1), but gives a “typing” effect and earlier partial content.

### 3. Optional: task queue for long-running research

- Backend: `POST /ask` returns immediately with `task_id`; a worker runs the ask in the background and stores the result under `task_id`.  
  `GET /tasks/{task_id}` returns `{ status: "running" | "done" | "failed", result?: ..., progress?: [...] }`.
- Frontend: “Research” mode: submit → show “Task created. Watch progress below.” Poll `GET /tasks/{task_id}` and show status + progress (and link to Deliberations for raw steps). When `status === "done"`, show the result.

Best for “fire and forget” research; more design work than (1) and (2).

---

## Summary

- **Today**: The hub is fine for **giving a request** and **getting the result** in Chat. It is **not** good for **following progress** for normal asks, because Deliberations isn’t populated for the standard ask path and Chat doesn’t show live steps.
- **Easily doable**: Add a few `_log_reasoning` calls in `orchestrator.ask()` and have Chat poll and display the last few deliberations while waiting. That gives a research-friendly “see what’s happening” experience with minimal code.
- **Next steps**: Streaming and/or task queue are natural follow-ups if you want longer-running research and richer UX.

---

## Other efficiency ideas

- **Streaming `/ask`**: Return tokens or chunks as they’re generated so the user sees partial output early; reduces perceived latency and avoids a single long wait.
- **Task queue + background priority**: For “research” or “background” requests, accept the ask and return a `task_id`; run in a worker and let the user poll or get notified. Frees the UI and allows long-running synthesis without timeouts.
- **RAG caching**: Cache embeddings or retrieval results for repeated or similar queries so the same context isn’t recomputed.
- **Council model subset**: Already in place via capacity (e.g. single_gpu_24gb → small/medium only). Further: “janitor” tier for background tasks so heavy models aren’t loaded for simple jobs.
- **Smaller system prompt for simple tasks**: When difficulty is “simple”, optionally use a shorter system prompt or a dedicated “janitor” persona to reduce tokens and latency.
- **Deliberations ring buffer size**: Tune `reasoning_log` maxlen (currently 100) if you want more or less history for debugging and the Live reasoning strip.

---

## Personality / soul: do agents get it by massive preprompting?

**Yes, by preprompting—but not necessarily “massive.”** In RoboFang, agent personality comes from the **PersonalityEngine**: one **system prompt** per **persona** (e.g. `sovereign`, `researcher`, `companion`). That system prompt is prepended to every reasoning request for that persona. So the “soul” is whatever you put in that system prompt.

- **Defaults** are short (1–3 sentences), e.g. sovereign: “You are a RoboFang Sovereign Agent. Your logic is industrial, technical, and zero-friction. You prioritize privacy, local execution, and empirical efficiency.”
- **You can make it massive**: `POST /personality/persona` lets you register a new persona with an arbitrarily long `system_prompt`. So yes, you can give an agent a long “soul” (principles, style, constraints, examples) via one big preprompt. Stored in SQLite and loaded at startup.
- **Council**: Council synthesis uses the same augmented user prompt; the synthesizer doesn’t get a separate persona today—you could extend that so the synthesizer has its own system prompt (e.g. “Equilibrium Synthesizer” style).
- **Efficiency note**: A very long system prompt costs tokens every call. For simple or janitor tasks, a short persona or a “minimal” system prompt keeps latency and cost down; reserve long “soul” prompts for complex or interactive roles.
