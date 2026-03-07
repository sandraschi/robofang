# Resonite Embodied Council Member — Setup Guide

**Version**: 1.0 | **Last Updated**: 2026-02-25

This guide explains how to make a Resonite avatar (vbot) or virtual sensor agent
participate in OpenFang Council of Dozens debates as a first-class adjudicator.

---

## Why an Embodied Council Member Is Not a Joke

Text LLMs can only reason about the world as they were trained on it. An embodied
agent in a running Resonite world has *actual state*:

- An avatar that has talked to 50 other users today brings social interaction history.
- A virtual robohoover with a lidar-mapped apartment brings coverage data, obstacle
  positions, and a cleaning schedule — information no language model can hallucinate.
- A virtual camera feed processed by a Resonite vision ProtoFlux chain brings spatial
  awareness the council would otherwise lack.

This is grounded epistemic input. It changes the council's reasoning in ways that
adding another LLM cannot.

---

## OSC Protocol

OpenFang sends prompts and receives responses on fixed OSC addresses:

| Direction | Address | Arguments |
| :-------- | :------ | :-------- |
| Prompt → Resonite | `/openfang/council/prompt` | `round_id: str`, `adjudicator: str`, `prompt: str` |
| Response ← Resonite | `/openfang/council/response` | `round_id: str`, `response: str` |

> **Critical**: The `round_id` must be echoed back in the response. OpenFang uses it 
> to match responses to pending futures.

---

## Resonite ProtoFlux Setup (Avatar / VBot)

### 1. OSC Receiver Node

```
OSC Input > String  →  address: /openfang/council/prompt
Output: String[0] = round_id
Output: String[1] = adjudicator_label
Output: String[2] = prompt_text
```

### 2. Processing (choose one)

**Option A — Hardcoded sensor response (e.g. robohoover D20):**
```
// Read coverage state from a dynamic variable or world slot
DynamicVariable<String> "CoverageReport"  → concat with prompt summary
String Builder: "Covered: {pct}% | Obstacle: {pos} | Last sweep: {ts}"
```

**Option B — Route to local LLM (if Resonite has network output available):**
```
// Use HTTP Request node (if available in your Resonite build)
// POST to local Ollama on 127.0.0.1:11434/api/generate
// Parse response JSON → extract .response field
```

**Option C — Avatar avatar-speech response:**
```
// The avatar can encode its "opinion" as a scripted response
// tied to world-state variables (who it talked to, what it observed)
```

### 3. OSC Sender Node (Response)

```
OSC Output > String  →  address: /openfang/council/response
Input: String[0] = round_id   (from receiver, echoed back)
Input: String[1] = response_string
```

---

## Registering an Embodied Council Member

Set `OPENFANG_COUNCIL_MODELS` env var (JSON):

```json
{
  "Red Team / Adversary": "resonite://127.0.0.1:9002/vbot-adversary",
  "Environmental / Physical": "osc://127.0.0.1:9001/robohoover-d20",
  "Architect": "llama3.1"
}
```

- `resonite://` — Resonite avatar on local or LAN host
- `osc://` — any OSC-capable agent (physical robots, sensor nodes, scripts)

Unspecified adjudicators fall back to Ollama.

---

## Virtual Dreame D20 Pro — Epistemic Contribution

The robohoover's contribution as a council member is not its reasoning ability
(it has none by default). Its contribution is **grounded world-state**:

```
Council role: Environmental / Physical Assessor
Lens: What does the physical state of the environment tell us about this decision?

[robohoover-d20 response]:
Coverage: 92% (2026-02-25T08:47:12) | Obstacle detected: (2.1, 0.8) — dining chair
Battery: 67% | Dock station: living_room_corner
No-go zones: kitchen_mat, hallway_rug
Recommendation: Physical environment is nominal. No constraints on proposed robot
traversal path through living room → kitchen corridor.
```

This is information none of the LLM adjudicators have. It grounds the council's
risk assessment in the actual state of the physical (or simulated) world.

---

## Port Allocation

| Service | Port | Notes |
| :------ | :--- | :---- |
| OpenFang OSC listener | 9010 | Default `OPENFANG_OSC_LISTEN_PORT` |
| Resonite avatar OSC | 9001 | Configure in Resonite world session settings |
| Robohoover sensor agent | 9002 | Set in sensor agent config |
| Resonite world default OSC | 9000 | Resonite built-in, avoid collision |

---

## Timeout Handling

OSC agents that don't respond within `OPENFANG_OSC_TIMEOUT` (default: 15s) produce
an `[OFFLINE]` entry in the debate record. The council continues without them — 
a missing agent degrades the quality of debate but does not halt the session.
