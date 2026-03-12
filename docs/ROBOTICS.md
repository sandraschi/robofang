# Robofang: Physical Hands (Robotics)

<p align="center">
  <img src="../assets/architecture.png" alt="Robofang Nervous System" width="800">
</p>

The name "Robofang" is an intentional provocation. It signifies that our agents are no longer purely digital constructs; they have "bite" in the physical world. This document outlines our strategic roadmap for physical agency, detailing the hardware we trust and the software layers that bring it to life.

## The Strategy: Hierarchical Hardware

We do not believe in a one-size-fits-all approach to robotics. Instead, we follow a tiered strategy that allows for both accessible learning and high-end industrial-grade performance.

### 1. The Primary Champion: Noetix Bumi
Priced at approximately $1,500, the **Noetix Bumi** is the cornerstone of our physical agency strategy. In the 2026 SOTA landscape, it represents the most accessible "full-stack" humanoid for agentic orchestration.

<p align="center">
  <img src="../assets/bumi_step2.png" alt="Noetix Bumi - THE NEXT STEP" width="500">
</p>

#### Technical Specifications (Advanced AI Edition)
- **Dimensions**: 94 cm (3.1 ft) Height | 12 kg (26.5 lbs) Weight.
- **Chassis**: High-strength plastic and aluminum alloy with lightweight composite reinforcement.
- **Actuation**: ≥ 21 Degrees of Freedom (DOF), supporting walking, running, and autonomous recovery.
- **Primary Compute**: Rockchip RK3576 (System Control).
- **AI Neural Substrate**: NVIDIA Orin Nano Super (Vision & Reasoning).
- **Power**: 48V / 3.5Ah+ Intelligent Battery (1-2 Hours operational life).
- **Perception**: Camera-based depth vision + "JoyInside" Voice Interaction v2.0.

#### The Robofang Advantage: Open Substrate
Unlike proprietary consumer bots, the Noetix Bumi Advanced AI Edition provides the open interfaces required for our **Embodied Sentience** loop. Robofang targets this platform specifically because it allows for:
1. **Low-Level Motor Control**: Direct actuation via ROS 2 nodes.
2. **Vision Ingest**: Real-time camera streams processed by the Orin Nano Super.
3. **Android/ROS Hybridity**: Leveraging Java/Kotlin for UI and C++/Python for heavy-duty motion control.

The Bumi is where our "Physical Hands" find their most expressive and capable outlet.

### 2. The Learning Foundation: Yahboom (Raspbot v2)
Every major journey begins with a first step, and for many Robofang users, that step is the **Yahboom Raspbot v2**. Starting at just $100, this platform is an incredible accessible entry point into the world of agentic robotics.

<p align="center">
  <img src="../assets/yahboom_step1.png" alt="Yahboom Raspbot - THE FIRST STEP" width="500">
</p>

We consider the Yahboom essential for the "learning" phase of the project. It provides an excellent sandbox for testing vision-based tracking using OpenCV, basic SLAM navigation, and simple agentic intentions. Before an agent attempts to manipulate a humanoid robot, it learns the fundamentals of spatial awareness and physics on a Raspbot.

### 3. Deemphasized: The Unitree Ecosystem
While we acknowledge the technical prowess of the **Unitree** lineup, we have deliberately deemphasized their platforms in the current iteration of Robofang. The primary reason is the high barrier to entry—specifically the price of their "Edu" models, which are required for full development access. 

The lower-cost consumer models in the Unitree stack often come with closed or restricted software layers that are fundamentally incompatible with the Robofang vision of a sovereign, open substrate. Until their open stack becomes more accessible, we choose to focus our energy elsewhere.

## The Reach: Software Integration

Physical agency is not just about the hardware; it's about the communication layer. Robofang bridges the gap between the agent's "mind" and its "hands" using:

-   **ROS (Robot Operating System)**: The industry standard that allows our Python-based orchestrator to talk to nearly any modern robot.
-   **python-osc**: This provides ultra-low latency, real-time synchronization. It allows an agent to maintain a "digital twin" in Unity3D while its physical hands are moving in reality.
-   **Standardized Hand Plugins**: We are developing a library of plugins that standardize how agents approach navigation, grasping, and environmental perception.

### The Bridge: Logic Flow

```mermaid
graph LR
    A[Agent Intent] --> B[Robofang Orchestrator]
    B --> C{Transport}
    C -->|High Latency / Admin| D[ROS 2 Node]
    C -->|Real-time Control| E[python-osc Bridge]
    D --> F[Bumi / Raspbot Motor Controllers]
    E --> F
    F --> G[Physical Actuation]
```

---
*True intelligence is measured by its impact on the physical world. We are building the reach.*
