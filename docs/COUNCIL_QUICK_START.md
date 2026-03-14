# Council quick start — give the council a simple task

## Checklist (what you need)

1. **Bridge and hub running**  
   `.\robofang-hub\start.bat` (or `.\start_all.ps1`). Hub at http://localhost:10870.

2. **Ollama running** with at least one council model.  
   Council members come from `configs/federation_map.json` → `council_members` (default: `llama3.2:3b`, `deepseek-r1:8b`, `qwen2.5:7b`).  
   - Start Ollama (e.g. `ollama serve` or run the Ollama app).  
   - Pull at least one model, e.g.:  
     `ollama pull llama3.2:3b`

3. **Ollama URL** (if not default).  
   Bridge uses `OLLAMA_URL` (default `http://127.0.0.1:11434`). Set in `.env` or env if Ollama is on another host/port.

4. **Guest can ask** (default).  
   Subject `guest` has `reasoning:ask` in default security policies, so the hub Chat is allowed to call `/ask` and council.

## Give a simple task

1. Open **http://localhost:10870** → **Chat** (Neural Interface).
2. Turn **Council Active** on (toggle shows “Council Active” when enabled).
3. Send a short, concrete prompt, e.g.:  
   - *“In one sentence, what is the main benefit of using multiple models in a council?”*  
   - *“List three short bullet points on securing an MCP hub.”*
4. Wait for the answer (council runs N models then synthesis; can take 30–90 s depending on models and hardware).

## If it fails

- **“All council members failed to respond”**  
  Ollama is not running, not reachable at `OLLAMA_URL`, or none of the council models are available.  
  Fix: start Ollama, run `ollama pull llama3.2:3b` (or another name from `council_members`), and retry.

- **“Subject 'guest' is not authorized for reasoning:ask”**  
  Security policies were changed. Restore `guest` with `reasoning:ask` or use a subject that has it.

- **Bridge /ask returns 500**  
  Check bridge logs (supervisor log or console). Common causes: Ollama connection error or missing model.

## Optional

- **Council members**  
  Edit `configs/federation_map.json` → `council_members` to use only models you have (e.g. `["llama3.2:3b"]` for a single-model “council” for testing).  
  Or set `COUNCIL_MEMBERS` in env (comma-separated, e.g. `llama3.2:3b,deepseek-r1:8b`).

- **Timeout**  
  Council can be slow. The hub Chat uses the default fetch timeout; for very long runs you may need to increase the timeout in `robofang-hub/src/api/chat.ts` (e.g. 180 s).

- **MCP tools**  
  For tasks that need tools (e.g. “list my VMs”), ensure the relevant MCP server is running and its backend URL is set (e.g. virtualization → 10701). After launch, use **Refresh MCP tools** or restart the bridge so the council sees the tools.

## Advocatus Diaboli (adversarial deliberations)

Council runs with an **optional devil's advocate** so one perspective argues against the request and stress-tests it.

- **Synthesis (Chat /ask with Council)**: When the council has ≥2 members, the **second member (index 1)** gets an adversarial prompt: argue *against* the request, list risks and counterarguments. The synthesizer sees both supporting and opposing views. On by default.
- **Adjudication (sensitive tool approval)**: The **last** council member is **Advocatus Diaboli**: argue against approval, list risks, then respond REJECTED or APPROVED. The High Adjudicator decides from all votes including the opposing view.
