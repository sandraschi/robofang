# Council of Dozens

The Council of Dozens is the adversarial coordination layer of RoboFang. It ensures high-quality outcomes by having multiple models critique each other's work.

---

## Roles

| Role | Purpose |
|------|---------|
| **Foreman** | Transforms a vague user "vibe" into a structured, executable specification. |
| **Worker** | Executes the specification using a ReAct (Reason + Act) loop with available tools. |
| **Satisficer** | Audits the Worker's output against the Foreman's original specification. |
| **Advocatus Diaboli** | Challenges risky or sensitive tool calls to ensure safety and logic. |

---

## Why Use a Council?

- **Reliability**: Single model inference often hallucinates or forgets constraints.
- **Safety**: The Advocatus Diaboli provides a logical gate for physical actions (robotics).
- **Cost**: Local-only inference means multi-model runs are free of per-token costs.

---

## Configuration

The council members are configured in `configs/federation_map.json`. It is recommended to use at least three different models (e.g., Llama 3.2, DeepSeek-R1, and Qwen 2.5) to ensure diversity of thought.
