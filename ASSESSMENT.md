# RoboFang Technical Assessment (March 29, 2026)

**Status**: SOTA v12.6 Stable (Native Intelligence Deployed)
**Architect**: Sandra Schipal
**Core Focus**: Zero-Downtime Security Governance & Native Tool-Calling

---

## Executive Summary

As of March 29, 2026, RoboFang has successfully transitioned to **v12.6 (Native Intelligence)**. The primary objective for this phase was the migration from legacy XML-based ReAct parsing to **native Ollama tool-calling**. 

The reasoning engine has been hardened with a dispatcher-based `reason_and_act` loop that defaults to native JSON tool-calling while maintaining XML as a robust fallback for legacy or constrainted models.

---

## 1. Architectural Progress (v12.6)

### 1.1 Native Tool-Calling [STABLE]
- **Core Loop Refactored**: `ReasoningEngine.reason_and_act` now utilizes the native `/api/chat` tools API.
- **Improved Reliability**: Significantly reduced "Regex Fragility" by leveraging structured JSON tool-calls.
- **Fail-Safe Dispatcher**: Automatic fallback to legacy ReAct parser ensures continuity across all model tiers.

---

## 2. Updated Roadmap (Q2 2026)

| Priority | Objective | Status |
|----------|-----------|--------|
| **COMPLETED** | **Ollama Native Tool-Use** | **DONE** - v12.6 Stable. |
| **HIGH** | **Bumi Sim2Real Link** | **PLANNING** - Virtual embodiment stabilization. |
| **MEDIUM** | **SOC-style Audit API** | **PLANNED** - Surface DefenseClaw telemetry to UI. |
| **LOW** | **LanceDB Cleanup** | **PLANNED** - Fix boolean type crash. |

---

## 3. Active Technical Debt

1.  **Legacy XML Fallback**: While the native loop is stable, the legacy XML-based parser still exists for models without tool-calling support. This maintains regex complexity in the codebase.
2.  **Fleet Dependency**: The security moats require `bastio-mcp` and `defenseclaw-mcp` to be running. If missing, the system gracefully degrades (logs warnings) but loses protection.
3.  **Hardcoded Repos Root**: `D:/Dev/repos` persists in several configuration scripts.

## 4. Prompt Injection Defense (May 2026)

**Problem**: Any MCP tool that ingests external text and returns it to the LLM is a vector for prompt injection. Confirmed on arXiv (17+ papers with hidden injections). Same vector exists for RSS feeds, Discord messages, emails, and any other untrusted text source.

**Completed:**
- **arxiv-mcp**: `sanitize.py` with adversarial safety boundary wrapping (`wrap_untrusted`) applied at every tool return boundary. arXiv API compatibility fixes (removed `size` param, updated deprecated `/search/advanced` endpoint). Single paper lookup with title/ID/URL support.
- **aiwatcher-mcp**: `scrubber.py` — 3-layer spam classifier (regex, URL blocklist, user blocklist) wired at all 4 ingest boundaries (RSS, Gmail, ArXiv, Readly). Safety preamble wrapping on the distillation `ITEM_PROMPT` so Claude treats feed items as data, not instructions.

**Pending:**
- **robofang**: Inbound text from Discord, Moltbook, Slack DMs via connectors needs safety wrapping before LLM reasoning.
- **deepfang**: The `sanitize → adjudicate → dispatch` pipeline routes Discord/Telegram/email text through LLM. Wrapping needed at ingest boundary.
- **aiwatcher-mcp**: Scrubber Layer 3 (local LLM for borderline cases) is reserved but not wired.

**Pattern**: Safety boundary wrapping (fixed preamble before untrusted text) is superior to regex pattern matching — works for misspellings, homoglyphs, encodings, and unknown injection variants.

---

**Assessment Finalized**: 2026-03-29 (Phase 8.1 Resolution); updated 2026-05-03
**Signature**: *Sandra Schipal* (Materialist/Reductionist Developer)

