# RoboFang: Financial Bastion (Cloud Budget Supervision)

The **Financial Bastion** is the project's primary defense against "bill shock" and unauthorized cloud API expenditure. It monitors, limits, and audits all outgoing traffic to non-local AI providers (Google, Anthropic, OpenAI).

---

## 1. The Cloud Budget Mandate

RoboFang is a **Local-First** project. Every cloud-based agentic call is a deliberate "frontier bridge" that must pass through the Financial Bastion's monitoring and enforcement layer.

| Component | Responsibility | Rationale |
|-----------|----------------|-----------|
| **Cost Estimator** | Predicting the cost of a request *before* sending. | Prevents sending 100MB of context to GPT-5 without notice. |
| **Token Tracker** | Quantifying actual tokens/minutes per session. | Records empirical spend for the [Forensic Audit Trace](PRD.md). |
| **Safety Circuit Breaker** | Immediate termination of all cloud connections. | Stops runaway agentic loops from draining your budget. |

---

## 2. Circuit Breaker Thresholds

The **Financial Bastion** enforces three levels of hardcoded budget thresholds.

1. **The Session Limit ($0.50)**: A single Council deliberation session cannot exceed this spend without a "Supervisor Lock" for manual approval.
2. **The Daily Hard-Cap ($5.00)**: All cloud tool-calls are disabled for 24 hours once this limit is hit.
3. **The Monthly Hard-Cap ($50.00)**: The global cloud provider keys are effectively "revoked" by the Bridge until the next billing cycle.

---

## 3. Loop Breaking Logic

To prevent "Agentic Runaway" (unbounded self-correction loops), the Bastion implements **Consecutive Call Monitoring**.

- **Threshold**: No agent may issue more than **10 consecutive cloud calls** within a single Task session.
- **Intervention**: On the 11th call, the **Supervisor** freezes the Task and presents a "Loop Review" prompt to the human operator on the Sovereign Dashboard.
- **Failover**: If the human operator is unavailable, the Task is automatically downgraded to **Tier 3 Local Inference** (Ollama) to stop the financial drain.

---

## 4. Multimodal Live Interaction (The "Nekimimi Guard")

Using low-latency APIs like **Gemini 3.1 Flash Live** requires specific safeguards due to the "Always-On" nature of streaming audio/video.

- **Interaction Proximity**: Multimodal vision/audio is only streamed when a user is detected within a 2-meter proximity radius in Resonite or Real-World (Unitree G1).
- **Sampling Throttling**: The frame rate of video input is dynamically adjusted between 1 FPS (Ambient) and 15 FPS (Active Interaction) based on task priority.
- **Idle Timeout**: If no user input (speech or gesture) is detected for 120 seconds, the Live API session is closed.

---

## 5. Cost Transparency & Auditing

The **Sovereign Dashboard** (port 10864) provides a real-time **Financial HUD**:
- **Live Session Cost**: Updating after every tool call.
- **Historical Spend**: Daily and monthly progress bars.
- **Projection**: Estimate of end-of-month spend based on current interaction frequency.
- **Forensic Logs**: A list of the top 10 most expensive agent prompts for optimization of the [Model Economy](MODEL_ECONOMY.md).
