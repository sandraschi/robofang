# cua_ops 1A SPEC - observe-only (status | screenshot | ground | help)

**Status:** draft for review, no code yet
**Scope:** read-only CUA observe layer in robofang. No clicks, no typing, no browser acts. 1B adds gated action.
**Conventions:** follows robofang portmanteau + structured dicts (AGENTS.md:17-18), annotations in `src/robofang/mcp_server.py:13-15`, voice_bridge template `src/robofang/bridges/voice_bridge.py:166-174`.

## 1. Goal

Give agents a safe eyes-first path: take a screenshot, ground a phrase to coordinates with confidence, log everything to existing audit. Prove delegation to uitars-mcp + pywinauto-mcp works before any action op exists.

Non-goals: no CV rebuild, no new VLM, no new vault, no container changes, no Hub approval buttons (1B), no watch loop (1C).

## 2. Ops schema

Tool: `cua_ops(operation: Literal["status","screenshot","ground","help"] = "help", ...) -> dict`

All returns: `{"success": bool, "operation": str, "message": str, "result": dict}` (voice_bridge.py:262 pattern).

### status
Input: none.
Output result: `{"delegates": {"uitars": "http://localhost:10976", "pywinauto": "http://localhost:10789", "deepfang": "http://localhost:10956"}, "reachable": {...}, "version": "1A"}`
Annotation: `_READ_ONLY`. No gate. Used by Hub health + preflight.

### screenshot
Input: `{"source": "uitars" | "pywinauto" = "uitars", "max_width": int = 1280}`
Output result: `{"image_b64": str, "width": int, "height": int, "source": str, "taken_at": iso8601}`
Rules: never write to disk by default (b64 in memory, cap 2MB). Downscale server-side. Audit each call via `storage.get_audit_logs` compatible event `cua.screenshot`.
Annotation: `_READ_ONLY`.

### ground
Input: `{"phrase": str (required, 3-120 chars), "screenshot_b64": str | null = null, "strategy": "auto" | "deterministic" | "vlm" = "auto", "min_confidence": float = 0.55}`
Output result: `{"x": int, "y": int, "confidence": float, "strategy_used": str, "candidates": [{x,y,confidence,label}], "model": "qwen2.5-vl:7b"}`
Rules:
* `auto` = deterministic first (pywinauto title/auto_id/OCR via scripts/cua-smoke.py helpers), VLM fallback only if deterministic < min_confidence.
* No coordinates returned below min_confidence (success=false, message suggests rephrase). Never click in 1A, even on 0.99.
* OCR text passed through deepfang sanitize before VLM prompt (encoded-payload deny).
Annotation: `_READ_ONLY`.

### help
Input: none. Output: op list + examples + 1B preview note.

## 3. Delegation map (no new deps)

robofang pyproject already has httpx + pydantic + fastmcp (no mss/pillow, keep it that way).

```
cua_ops screenshot(source=uitars)
  -> GET http://localhost:10976 screenshot (uitars_mcp 8-10 tools: screenshot/click/type)
  -> fallback GET http://localhost:10789 screenshot (pywinauto-mcp 18-22 ops)
  -> timeout 8s each, fail-closed: both down => success=false, message lists ports

cua_ops ground(phrase, strategy=auto)
  -> deterministic: POST http://localhost:10789 elements/ocr locate (reuse cua_env/computer_vision/template_library)
  -> vlm fallback: POST http://localhost:10976 uitars_execute {screenshot, phrase} via vlm_client (OpenAI /v1/chat/completions image_url, default qwen2.5-vl:7b Ollama)
  -> sanitize OCR/VLM I/O via http://localhost:10956 sanitize (deepfang rules.yaml)
  -> timeout 15s VLM, 5s deterministic
```

New file: `src/robofang/bridges/cua_bridge.py` (mirrors voice_bridge.py). Register in `src/robofang/mcp_server.py:33-45` with `mcp.tool(annotations=_READ_ONLY)(cua_ops)`, wired via `app/lifecycle.py:161-164` (no lifecycle change needed).
Config: `src/robofang/app/fleet.py:113,162` already maps pywinauto URL. Add uitars `http://localhost:10976` + deepfang `http://localhost:10956` beside it (1 file edit).
No DB migration. Audit via existing `core/storage.py:227 get_audit_logs` + `app/api/events.py:89-94`.

## 4. Confirm queue shape (forward-compat, 1A audit-only)

1A writes audit events only. Shape defined now so 1B adds approve/deny without schema break.

Existing: `webhooks.py:18 /hooks` + `:55-63 /audit` (fire-and-forget notify), `mcp_server.py:420-435 shutdown(confirm=False)` pattern, `orchestrator.py:84-90 SENSITIVE_TOOLS`, Hub `Inbox.tsx:1-11` demo only, `api/inbox.ts` exists.

1A event: `{"id": uuid, "ts": iso, "type": "cua.screenshot|cua.ground", "actor": str, "params_hash": sha256, "result_summary": str, "needs_approval": false}`
1B reuses same envelope with `needs_approval=true, proposed_action: {op, x, y, phrase}, approve_token: null`. Hub Inbox adds read-only list in 1A (`GET /events` already exists), approve/deny buttons land in 1B (`POST /hooks/audit` extended from notify to verdict store).

No new tables in 1A. 1B adds `cua_approvals` (id, event_id, verdict, decided_by, decided_at) or reuses deliberations log - decide in 1B spec.

## 5. Safety (1A)

* Read-only by construction: bridge module exposes no click/type/post. Code review gate: grep `pyautogui.click|press|hotkey|mouse.` must return zero in `cua_bridge.py`.
* B64 cap 2MB, phrase length cap, iteration cap n/a (single-shot).
* Secrets: none touched. Any credentialed screen content stays in memory, never logged raw (log params_hash + summary only).
* Fail-closed: delegate down, timeout, low confidence, sanitize deny => success=false, no retry loop.
* Kill-switch/HITL from pywinauto safety.py reused by reference, not copied.

## 6. Hub UI (1A minimal)

* `robofang-hub/src/pages/Inbox.tsx`: add read-only "CUA observes" section listing `GET /events?source=cua` (screenshot time + phrase + confidence). No buttons.
* `src/api/inbox.ts`: add `listCuaEvents()` hitting existing `/events`. 2 files max.
* 1B adds Approve/Deny + screenshot thumbnail + params diff.

## 7. Verification (must demo on Goliath)

```
1. uv run robofang, open Hub :10870, Bridge :10871 healthy.
2. cua_ops status => all three delegates reachable.
3. cua_ops screenshot => b64 + dims, audit row in /events.
4. cua_ops ground "Notepad Close button" => x,y + confidence >= 0.55, strategy_used logged.
5. cua_ops ground "gibberish xyz123" => success=false, no coords.
6. Kill uitars :10976 => fallback to pywinauto or clean fail message. No traceback to caller.
7. grep click/press in cua_bridge.py => zero hits.
```

## 8. Rollout commits (<=5 files each, .bak for 3+)

* C1: `bridges/cua_bridge.py` (new) + `mcp_server.py` (register) + `app/fleet.py` (urls) + `docs/CUA_OPS.md` (new user doc). 4 files.
* C2: Hub `Inbox.tsx` + `api/inbox.ts` read-only list. 2 files.
* C3: `scripts/cua-1a-verify.py` (mirrors scripts/cua-smoke.py style) + this spec marked implemented.

## 9. Open questions for Sandra

1. Keep b64 in-memory only, or allow `save_to` workspace path for debugging? (Spec default: memory only.)
2. Deterministic-first vs VLM-first default? (Spec: deterministic-first for cost + precision.)
3. min_confidence 0.55 ok, or stricter 0.70 for 1B carryover?
