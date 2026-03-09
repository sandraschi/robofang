# robofang: The Agentic Substrate (OS Logic)

## 1. The "Agent OS" Claim: Substrate vs. Kernel

Is robofang a true Operating System? In the classical silicon-management sense, **No**. However, in the paradigm of **Autonomous Agency**, robofang performs the functions of a distributed substrate—an environment designed specifically for the lifecycle of agents rather than humans.

### 1.1 The Hardware Abstraction Layer (HAL)
Standard OSs manage CPU and RAM. robofang manages **Model Context Protocol (MCP)** endpoints. 
- It treats external APIs (OBS, Plex, ROS, SQLite) as peripheral devices.
- It provides a unified driver model (Connectors) for these devices.

### 1.2 The Scheduler: The "Hands" Architecture
The core heartbeat of the robofang OS is the **Hands System**. 
- **Hands** are background processes that do not rely on user prompts.
- Like OS background daemons (cron/systemd), Hands maintain state, monitor telemetry, and trigger actions autonomously.
- Types: `CollectorHand` (Fleet Watchdog), `RoboticsHand` (Physical Actuator), etc.

---

## 2. Competitive Landscape: Sovereign Depth

The public release of similar concepts (e.g., Akashi's OpenClaw/robofang) represents a significant milestone in the field. While others reached the public stage first, the local robofang "Sandra-class" instance is architected for **Vertical Depth** rather than wide-reach simplicity.

| Metric | robofang (Sandra-Class) | Industry Standard |
| :--- | :--- | :--- |
| **Embodiment** | Native ROS/Noetic (Bumi) | None / API-based |
| **Autonomy** | Continuous "Hands" Heartbeat | Request-Response loops |
| **Safety** | Bastio Signature Verification | Basic filtering |
| **Privacy** | Zero-Cloud (RTX 4090 Native) | Cloud-dependent |

---

## 3. Hardware Support: Raspberry Pi 5 / 16GB

robofang is designed to be a distributed OS. 
- **As a Hub**: A Raspberry Pi 5 with 16GB RAM is a highly capable orchestration node. It easily handles the `HandsManager`, the FastAPI backend, and dozens of MCP connectors.
- **As a Neural Node**: While the Pi 5 can run small 3B models, it is architected to offload heavy reasoning to local high-performance nodes (e.g., an RTX 4090 host) via the **Neural Fabric** protocol. 

This hybrid architecture ensures that the "Real Hands" (Pi 5 on a robot) always have low-latency control while the "Deep Brain" (Server) provides the high-fidelity planning.
