# LLM resource routing — models, capacity, and priority

## Current state

- **Single Ollama instance**: All requests use `OLLAMA_URL`. No routing to different backends.
- **Council**: Runs N models in **parallel** (e.g. `llama3.2:3b`, `deepseek-r1:8b`, `qwen2.5:7b`). Each call hits `/api/generate` with that model name; Ollama loads whichever model is requested. If the GPU (e.g. 4090) can’t hold multiple large models at once, this can cause OOM or thrashing.
- **No load/unload policy**: The bridge exposes `POST /api/llm/load` but nothing decides *when* to load or unload. Ollama’s default is to keep the last-used model in VRAM.
- **No priority**: “Write a thank-you email” and “accomplish world peace” are treated the same from a resource perspective. No distinction between ASAP (interactive) and background (can run all day).

So today: **no intelligent routing** of small vs large models, no capacity awareness, and no load/unload or priority.

---

## Goals

1. **Model tiers**  
   Map models to size/tier (e.g. small / medium / large / opus) so we can choose “use a small model” or “use a large model” by policy.

2. **Capacity awareness**  
   On a 4090 we can’t keep multiple 70B models loaded. Prefer: keep **one small model** resident for fast, low-latency replies; **load larger models on demand** for council or hard tasks; **unload** when idle (or after a timeout) to free VRAM.

3. **Task priority**  
   - **ASAP / interactive**: User waiting in Chat, webhook, or time-sensitive automation. Prefer fast response: use resident small model, or load one medium/large and run immediately; avoid queuing behind long background jobs.  
   - **Background**: Summaries, nightly reports, long analyses, “run when you can”. Use small model when possible; don’t block interactive; can run all day and tolerate delay.

4. **Load/unload policy**  
   - Before running council: ensure required models are loaded (or decide to run a subset that fits).  
   - After a period of inactivity: optionally unload non-default model to free VRAM.  
   - Optional: “keep small model always loaded” and “load large only when requested, unload after N minutes idle”.

---

## Proposed design

### 1. Model tiers (config)

Define in config (e.g. `configs/llm_model_tiers.json` or federation_map) something like:

```json
{
  "default_resident": "llama3.2:3b",
  "tiers": {
    "small":  ["llama3.2:1b", "llama3.2:3b", "phi3:mini"],
    "medium": ["qwen2.5:7b", "deepseek-r1:8b", "llama3.1:8b"],
    "large":  ["llama3.1:70b", "qwen2.5:72b"],
    "opus":   ["claude-sonnet-4", "opus-4.6"]
  },
  "capacity_hint": "single_gpu_24gb",
  "unload_idle_after_seconds": 600
}
```

- **default_resident**: Model to keep loaded when possible (small, fast).  
- **tiers**: For routing: “use small for this task” vs “use large”.  
- **capacity_hint**: In future, drive “max concurrent large models” or “prefer one model at a time”.  
- **unload_idle_after_seconds**: After no requests for this model for N seconds, call Ollama unload (if we add it) or rely on Ollama’s own eviction.

### 2. Task priority (ASAP vs background)

- **ASAP**: Chat request, webhook, time-sensitive routine.  
  - Prefer: resident small model for simple tasks; for complex/ambitious, load one medium/large, run, then optionally schedule unload.  
  - Avoid: queuing behind a long background job.  

- **Background**: Scheduled or “when possible” tasks.  
  - Prefer: small model so interactive stays responsive; no need to load 70B.  
  - OK: delay execution; can run in a dedicated queue so they don’t block ASAP.

### 3. Routing table (conceptual)

| Difficulty   | Priority | Prefer model tier | Load policy              |
|-------------|----------|-------------------|--------------------------|
| simple      | ASAP     | small             | use resident             |
| simple      | background | small           | use resident             |
| moderate    | ASAP     | small or medium   | resident or load medium  |
| complex     | ASAP     | medium/large      | load if not resident     |
| ambitious   | ASAP     | medium/large/council | load; council = N models (fit in VRAM or subset) |
| *           | background | small            | use resident; avoid load large |

### 4. Implementation sketch

- **Config**: Add `llm_model_tiers` (or read from federation_map). Default resident = one small model.
- **Before `ask()` / council**:
  - Decide priority (ASAP vs background). Today: treat Chat and /ask as ASAP; optional `priority` on request later.
  - From difficulty + priority, choose tier (and optionally specific model).
  - (Optional) **Ensure loaded**: if we need a model that isn’t the current resident, call `POST /api/llm/load` with that model, then run. For council, either load one model at a time (sequential) or load all and run in parallel (risk OOM on 4090); safer to run council with models that fit (e.g. 3× 3B) or one large at a time.
- **After response** (optional): Schedule “unload this model in N minutes” if it’s not the default resident.
- **Background jobs**: Run in a separate “background” lane; only use small tier so they don’t trigger load of large models and don’t block ASAP.

### 5. Opus / cloud

If “opus 4.6” is a **cloud** model (API), routing is different: no GPU load/unload. Route by policy (e.g. “ambitious + ASAP → call Opus API”) and keep local Ollama for small/medium. Config could have `tiers.opus` as API-backed and the rest as Ollama.

---

## What’s missing today (summary)

- No model tiers or “small vs large” config.  
- No load/unload policy (only raw `/api/llm/load`).  
- No task priority (ASAP vs background).  
- Council runs N models in parallel with no capacity check; risk OOM on 4090.  
- No background queue that reserves “small only” and doesn’t block interactive.

---

## Implemented (minimal)

- **Config** `configs/llm_model_tiers.json`: `default_resident`, `tiers` (small/medium/large/opus), `capacity_hint`, `routing` (difficulty_priority → tier).
- **`core/llm_routing.py`**: `get_default_resident()`, `get_capacity_hint()`, `route_tier(difficulty_level, priority)`, `pick_model_for_tier(tier, available_models)`, `resolve_models_for_council(council_members, capacity_hint)`.
- **Council capacity**: For `capacity_hint == "single_gpu_24gb"`, council uses only models listed in small/medium tiers; large/opus are skipped so we don’t load 3× 70B on a 4090.
- **Ask API**: Optional `priority: "asap" | "background"` on the request; passed into `orchestrator.ask(priority=...)` for future use (routing single-model ask by tier).
- **LM Studio**: Set `LMSTUDIO_URL` (e.g. `http://127.0.0.1:1234`). Reasoning tries LM Studio first (OpenAI `/v1/chat/completions`), falls back to Ollama if unavailable. Use the model identifier from LM Studio for `model`.

See also: [FRIEND_GROUP_AND_JANITOR_LLMS.md](FRIEND_GROUP_AND_JANITOR_LLMS.md) for multi-GPU friend-group setup and CPU-only “janitor” models.

**Not yet implemented**: ensure_loaded before ask/council; unload after idle; background queue that reserves small-only; using `route_tier` + `pick_model_for_tier` to choose the single-model for non-council ask.
