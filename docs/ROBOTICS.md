# Robotics Integration: Physical Agency

RoboFang is designed to bridge the gap between digital agents and physical hardware. This document outlines the strategy for physical agency and the integration of robotic manipulators.

---

## 🏗️ Hardware Strategy
We utilize a tiered approach to robotics, focusing on platforms that offer an open interface for agentic control.

### 🌟 The Breakthrough: Noetix Bumi
The **Noetix Bumi** represents a fundamental shift in the robotics landscape—an Android substrate delivered at an **"iPhone-level price point."** Historically, humanoid platforms have been restricted to high-cost research environments; the Bumi brings high-fidelity physical agency into a manageable $1,399 (¥10,000 range) scale.

This is the cornerstone of our physical agency strategy. In the current landscape, it is the first mass-market humanoid capable of granular agentic orchestration.

#### Technical Specifications
- **Dimensions**: 94 cm Height | 12 kg Weight.
- **Actuation**: ≥ 21 Degrees of Freedom (DOF), supporting complex motion and balance.
- **Compute**: Rockchip RK3576 (Control) + NVIDIA Orin Nano Super (Vision/Reasoning).
- **Perception**: Integrated depth vision and voice interaction arrays.

#### The Open Substrate
Robofang targets the Bumi platform specifically because of its open interfaces:
1. **Low-Level Control**: Direct actuation via ROS 2 nodes.
2. **Vision Ingest**: Real-time processing of camera streams for spatial reasoning.
3. **Hybrid Architecture**: Leverages ROS for motion and custom API layers for agentic intent.

---

### 🎓 Learning & Prototyping: Yahboom Raspbot v2
For initial experimentation and mapping, we support the **Yahboom Raspbot v2**. This platform is a highly accessible entry point for testing vision-based tracking and basic agentic navigation. It serves as a sandbox for refining the algorithms that eventually drive more complex humanoid manipulators.

---

## 🔌 Software Integration: The reach
Physical agency is managed through a dedicated communication layer:

- **ROS (Robot Operating System)**: The standard for low-level communication.
- **python-osc**: Used for real-time synchronization between the agent's internal model and the physical world.
- **Actuator Plugins**: A library of standardized controllers for navigation and environmental interaction.

### 📊 Terminology Discipline
To avoid confusion, **"Hands"** are defined strictly as **Metaphoric Extension Processes** (subordinate agents). The physical robot arms, claws, and legs are referred to as **Manipulators** or **Actuators**.

---
*True utility is measured by impact on the physical world. We are building the reach.*
