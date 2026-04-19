# RoboFang: Model Economy & VRAM Orchestration

The **Model Economy** is the project's strategy for optimizing the performance of a single **NVIDIA RTX 4090 (24GB VRAM)** while managing high-reasoning tasks and real-time interactions.

---

## 1. Tiered Inference Strategy

To maximize efficiency and minimize VRAM pressure, RoboFang uses a tiered approach to model selection.

| Tier | Role | Models | VRAM Usage | Keep-Alive |
|------|------|--------|------------|------------|
| **Tier 1 (Foreman)** | Architecture / Planning | Llama 3.3 70B (4-bit Q4_K_M) | ~19-24GB | High (5m) |
| **Tier 2 (Laborer)** | Complex Execution / Coding | Gemma 3 27B / Qwen 2.5 32B | ~14-18GB | Medium (1m) |
| **Tier 3 (Evaluator)** | Audit / Routing / Formatting | Llama 3.2 3B / Phi-4 14B | ~4-8GB | **None (0s)** |

---

## 2. VRAM Orchestrator (GPU Management)

The **VRAM Orchestrator** is a component of the Bridge that manages the loading and unloading of models via the Ollama/LM Studio API.

### Orchestration Rules

1. **Mandatory Pruning**: All Tier 3 models must be called with `keep_alive: 0`. They are loaded for a single request and purged immediately to free memory.
2. **Prioritized Preemption**: Real-time HRI tasks (e.g., Nekimimi-chan in Resonite) have **Absolute Preemption**. If a background "Hand" is using a Tier 2 model, it is paused and the model is unloaded (`ollama stop`) to make room for the HRI multimodal model.
3. **Double-Buffering Prevention**: The orchestrator prevents two large models (Tier 1 and Tier 2) from being loaded simultaneously to avoid OOM (Out Of Memory) failures.
4. **Unload Heartbeat**: If no agentic activity is detected for 10 minutes, the orchestrator issues a global `ollama stop` to clear the GPU for other system tasks (e.g., video editing, gaming).

---

## 3. GPU Contention Policy

When multiple agents compete for the same 4090 resource, the Orchestrator applies the following priority queue:

1. **CRITICAL**: Real-time Voice/Vision (Gemini Live fallback or Moshi).
2. **HIGH**: Human-initiated "Foreman" planning sessions.
3. **MEDIUM**: Active "Labor" task execution.
4. **LOW**: Background "Hands" (e.g., periodic security scans, data aggregation).

---

## 4. Local-First Optimization

The project prioritizes **Local-First** inference to ensure sovereignty and zero per-token cost.

- **Quantization**: We use **GGUF (Q4_K_M)** as the standard for 70B models to fit within the 24GB limit while maintaining high reasoning fidelity.
- **Context Management**: We limit context windows to 8K-16K for local models where possible, to save VRAM for KV-cache.
- **Speculative Decoding**: (Future) Implementation of Tier 3 models acting as drafters for Tier 1 models to reduce time-to-first-token.

---

## 5. Automated Monitoring

The **Bastion** monitor tracks GPU memory usage via `nvidia-smi` or `py3nvml`. If VRAM exceeds 95%, the Bastion triggers an emergency `UnloadAll` event and returns a `ResourceBusy` error to any queuing agents.
