# Friend-group GPUs, janitor LLMs, and AMD NPU

How to use RoboFang when everyone has a GPU (NVIDIA or AMD), how to use tiny CPU-only models for “janitorial” tasks, and **2026 status of AMD NPUs**.

---

## 1. Friend group: everyone tooled up with NVIDIA GPU

Useful when you’re in a group where each person has a GPU and runs Ollama (or LM Studio). You can spread reasoning and council across machines so no single box is overloaded.

### What RoboFang supports today

- **Local**: One machine runs the Nexus (hub + bridge). It uses **LM Studio** first if `LMSTUDIO_URL` is set, then **Ollama** (`OLLAMA_URL`). So on your own PC you can “glom on” to LM Studio when it’s running, and fall back to Ollama otherwise.
- **Remote nodes**: You can add **friends’ machines as nodes** in `configs/federation_map.json`. The reasoning engine can send work to a node via `model@node`. Each node must expose an **Ollama-compatible** `/api/generate` endpoint (Ollama itself or a proxy that speaks that API).

### Setting up a friend as a node

1. **On the friend’s machine**
   - Install and run **Ollama** (or an Ollama-compatible server).
   - Option A: Run Ollama and allow LAN access: start with `OLLAMA_HOST=0.0.0.0` (or equivalent) so it listens on the LAN IP, and note the port (default 11434).
   - Option B: They run the RoboFang bridge/substrate that proxies to their local Ollama; then they expose the port that serves `/api/generate` (e.g. 10867 for a Substrate node).

2. **Network**
   - Same LAN: use the friend’s LAN IP (e.g. `192.168.1.50`).
   - Elsewhere: use **Tailscale** (or similar) so each machine has a stable hostname (e.g. `friend-pc.tail1234.ts.net`). RoboFang already has a Tailscale connector; use it to get reachable hostnames and put them in the node `host` field.

3. **On your Nexus (your config)**
   - Edit `configs/federation_map.json` and add a node per friend, e.g.:

   ```json
   "nodes": {
     "master": { "name": "Nexus-01", "host": "localhost", "role": "nexus", "port": 10867 },
     "alice": {
       "name": "Alice-PC",
       "host": "192.168.1.50",
       "role": "satellite",
       "port": 11434
     },
     "bob": {
       "name": "Bob-Laptop",
       "host": "bob-laptop.tail1234.ts.net",
       "role": "satellite",
       "port": 11434
     }
   }
   ```

   Use `port: 11434` if the friend exposes Ollama directly, or the bridge port if they run a proxy.

4. **Council across friends**
   - Council members can be specified as `model` or `model@node`. If you set `council_members` to e.g. `["llama3.2:3b@alice", "qwen2.5:7b@bob", "llama3.2:3b"]`, the first two run on friends’ GPUs and the third on your local Ollama/LM Studio. That spreads load and uses everyone’s hardware.

5. **LM Studio in the group**
   - LM Studio’s “serve on local network” (if available) makes it an OpenAI-compatible server on the LAN. Today RoboFang only uses `LMSTUDIO_URL` for the **local** machine. To use a friend’s LM Studio, they’d need to expose an **Ollama-compatible** API (e.g. via a small proxy) or you’d add a dedicated “LM Studio remote” backend in the future. For now, the friend-group pattern is: **nodes = Ollama (or Ollama-compatible) endpoints**.

### Summary (friend group)

| Who        | Runs                         | You point to                          |
|-----------|------------------------------|----------------------------------------|
| You       | LM Studio and/or Ollama      | `LMSTUDIO_URL`, `OLLAMA_URL` (local)  |
| Friend A  | Ollama on LAN or Tailscale   | Node `alice` with `host` + `port`     |
| Friend B  | Same                         | Node `bob` with `host` + `port`       |

Council and single-model asks can use `model@node` to use their GPUs.

---

## 2. Super-small / CPU-only LLMs for “janitorial” tasks

For background, low-stakes work (cleanup, simple classification, repetitive summaries, retries), you don’t need a big GPU model. Small models that run in **RAM on CPU** are enough and leave the GPU for interactive or heavy tasks.

### What runs without a GPU

- **Ollama**: Uses GPU when available and falls back to **CPU** if no GPU or if the model doesn’t fit. So you can run a tiny model and let it use only RAM/CPU.
- **LM Studio**: Can run models on CPU as well; same idea.
- **llama.cpp**: CPU-first inference; supports strong quantization (e.g. 4-bit). Many “tiny” models are distributed in GGUF for llama.cpp.
- **CompactLLM (Python)**: “Potato tier” (<4 GB RAM) models: e.g. SmolLM2-135M (~0.3 GB), Qwen 2.5 0.5B (~0.6 GB), TinyLlama (~1 GB), Gemma 3 1B (~1 GB). Good for “janitor” use on a low-RAM machine.

### Examples of “janitor-sized” models (CPU / low RAM)

| Model            | Rough size / RAM   | Notes                                      |
|------------------|--------------------|--------------------------------------------|
| SmolLM2-135M     | ~0.3 GB            | Very small; good for trivial classification |
| Qwen 2.5 0.5B    | ~0.6 GB            | Tiny, fast                                 |
| TinyLlama 1.1B   | ~1 GB              | Widely used, CPU-friendly                   |
| Phi-2 / Phi-3 mini | ~2–4 GB (quantized) | Better quality, still CPU-viable          |
| SmallThinker-4B  | ~1 GB (Q4_0)       | Designed for local CPU (2025)              |

Run these in Ollama (e.g. `ollama run tinyllama`) or via llama.cpp/CompactLLM; no GPU required.

### How to use them in RoboFang for janitorial work

- **Routing**: Today, difficulty and priority (ASAP vs background) can drive *which* model tier is chosen. For “janitor” tasks you want:
  - **Priority = background**
  - **Difficulty = simple**
  - **Model tier = smallest** (e.g. a 1B or 0.5B in your `llm_model_tiers.json` “small” tier, or a dedicated “janitor” tier).
- **Config**: Add a tiny model (e.g. `tinyllama`, `smollm2:135m`, or whatever you pull in Ollama) to your config. Put it in the bottom tier (e.g. `small` or a new `janitor` tier) and route **background + simple** to that tier so those tasks use CPU/RAM only and don’t touch the GPU.
- **Federation**: You can also run a tiny model on a **low-spec or headless box** (e.g. a NAS or an old PC) that only has RAM. Run Ollama there with a single small model, add it as a **node**, and route janitorial tasks to `model@that_node`. That keeps “janitor” work off everyone’s gaming GPUs.

### Summary (janitor LLMs)

- **Yes**: There are very small LLMs (0.1B–1B parameters, quantized) that run in RAM on CPU with **no GPU**.
- **Use them for**: Background, simple, or repetitive tasks (cleanup, retries, simple summaries, classification).
- **In RoboFang**: Put a tiny model in your tiers, route **background + simple** to that tier (or a dedicated janitor tier), and optionally run that model on a separate CPU-only node so GPU machines stay free for interactive and council work.

---

## 3. AMD NPU (2026 status): are they useful? Can we use them?

**Short answer: yes.** AMD NPUs (Ryzen AI) are now usable for LLM inference and other local AI. You can use them from RoboFang by pointing at an **OpenAI-compatible** server that runs on the NPU.

### What’s available in 2026

- **Ryzen AI Software** (e.g. 1.7): NPU execution for LLMs via **OGA** (ONNX Generate). Supports Strix and Krackan Point (Ryzen AI 300 series); not all older Phoenix/Hawk Point SKUs get NPU LLM support. Pre-optimized models (Phi-3.5, Mistral-7B, Llama-3.2, Qwen, DeepSeek, etc.) are available for NPU deployment.
- **Lemonade**: AMD’s open-source, local-first runtime with an **OpenAI-compatible API**. It auto-selects **NPU, GPU, and CPU** backends. So from an app’s perspective it looks like “another local LLM server” (like LM Studio). Integrations exist for OpenWebUI, n8n, VS Code, etc. Python SDK: `pip install lemonade-sdk[dev,oga-ryzenai]` (AMD PyPI). Recipes include `oga-npu` (NPU-only) and `oga-hybrid` (NPU + iGPU) for Ryzen AI 300.
- **DirectML / Windows ML**: Microsoft’s stack can target AMD NPUs for ONNX inference (5–10× over CPU in some benchmarks). More low-level; Lemonade is the easier path for “run an LLM on my AMD PC.”
- **Use cases**: LLM chat, image generation, speech-to-text, text-to-speech; real-time object detection and other vision models run well on 2026 Ryzen AI hardware.

So the NPU is no longer a paper feature: it’s used for real inference, especially on Ryzen AI 300 series.

### Using AMD NPU from RoboFang

RoboFang’s reasoning engine today tries **LM Studio** (OpenAI-compat) then **Ollama**. **Lemonade is OpenAI-compatible.** So in principle:

1. **Run Lemonade** on the AMD PC (desktop app or server mode). It exposes an OpenAI-style endpoint.
2. **Point RoboFang at it** the same way as LM Studio: set the base URL of that server (e.g. `LEMONADE_URL=http://127.0.0.1:PORT` if Lemonade adds a configurable port, or use whatever port it uses). Implementation would be the same pattern as `LMSTUDIO_URL`: try the Lemonade endpoint first, then fall back to Ollama (or LM Studio). No code path today specifically names “Lemonade”; adding a generic “secondary OpenAI-compat backend” or a `LEMONADE_URL` check would allow using the NPU without changing app logic.
3. **Friend group**: If a friend has an AMD AI PC, they could run Lemonade and expose it on the LAN (or via Tailscale). You’d need either an Ollama-compat proxy in front of Lemonade, or RoboFang to support “OpenAI-compat remote node” in addition to “Ollama-compat node.” That’s a small extension.

**Summary**: AMD NPUs are useful in 2026 for local LLM and multi-modal inference. The practical way to use them from RoboFang is via **Lemonade** (OpenAI-compatible). Adding a Lemonade/OpenAI-compat backend alongside LM Studio would let AMD NPU (and hybrid NPU+iGPU) machines participate in the same way as LM Studio does today.
