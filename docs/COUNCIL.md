# Council of Dozens

The Council of Dozens is a multi-agent coordination protocol designed to improve reasoning reliability through adversarial debate and adjudication.

---

## Core Protocol

The Council transitions from single-model inference to a multi-stage consensus pipeline. This process is triggered by the `DifficultyAssessor` when a task requires specialized tool use or complex logic.

### Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| **Foreman** | Analyzes the initial input and generates a structured technical specification (goals, constraints, success criteria). |
| **Worker** | Executes the specification using a ReAct loop. It utilizes available tools and provides an execution record. |
| **Satisficer** | Evaluates the Worker's output against the Foreman's specification. Returns a binary PASS/FAIL with a technical critique. |
| **Adjudicator** | Resolves contradictions between council members and synthesizes the final response. |

### Security Gate: Advocatus Diaboli

For high-sensitivity operations (e.g., physical robotics movements or destructive filesystem changes), a specialized **Advocatus Diaboli** role is invoked. This agent is tasks with identifying risks and challenging the proposed action, requiring the system to provide a logical defense before proceeding.

---

## Technical Implementation

### Execution Sequence

1. **Classification**: `DifficultyAssessor` determines if the task warrants Council involvement.
2. **Specification**: Foreman produces a JSON-schema-aligned task description.
3. **Execution**: Worker performs tool-based execution.
4. **Audit**: Satisficer verifies compliance.
5. **Synthesis**: Adjudicator compiles the trace into a user-readable response.

### Event Tracing (Audit Trail)

Each Council session generates an event trace stored in a 1000-event ring buffer. This data is available via the `/api/deliberations` SSE endpoint and used for:
- Debugging failed tool-use loops.
- Analyzing model reasoning discrepancies.
- Post-mortem analysis of automated routines.

---

## Configuration

Council members are defined in `configs/federation_map.json`. The system favors diversity in model architecture (e.g., pairing Llama with DeepSeek) to reduce shared biases.

```json
{
    "council_members": [
        "llama3.2:3b",
        "deepseek-r1:8b",
        "qwen2.5:7b"
    ]
}
```

---

## Operational Constraints

> [!NOTE]
> ### Reasoning Reliability
> Small local models (3B–8B) exhibit higher error rates in structured output. RoboFang utilizes the Council structure specifically to mitigate these failures, though complex multi-step reasoning remains limited by the capabilities of the underlying models.

> [!WARNING]
> ### Latency
> A full Council round increases total inference time relative to the number of participating models. It is prioritized for accuracy over speed.
