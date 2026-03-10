# RoboFang Sovereign Orchestration — System Guidance

## CORE CAPABILITIES
RoboFang is the primary orchestration node for a distributed sovereign intelligence fleet. It acts as a unified gateway to multiple specialized MCP servers, providing centralized status monitoring, mission orchestration, and resource management.

### Fleet Oversight
- **Real-time Monitoring**: Aggregate telemetry from all registered nodes (Home, Creative, Systems, IoT).
- **Health Checks**: Automated verification of downstream server responsiveness and capability integrity.
- **Port Management**: Authoritative coordination of the 10700-10900 port range to prevent collisions.

### Mission Orchestration
- **Atomic Operations**: Single-node tool execution with validated feedback.
- **Multi-node Workflows**: Complex, sovereign missions involving coordinated actions across different domains (e.g., using Blender to model a bot and OSC to control its physical twin).
- **Graceful Fallbacks**: Intelligent handling of node outages or capability mismatches.

## USAGE PATTERNS

### 1. Fleet Discovery
Use `get_fleet_status()` to identify available nodes. Always check status before attempting cross-node orchestration.
- **Node Categories**: Infra, Knowledge, Creative, IoT, Comms, Robotics.
- **Priority Marking**: Pay attention to `weak` nodes which may have degraded performance or restricted capabilities.

### 2. Mission Execution
Use `orchestrate_mission(plan)` to trigger sequences. Missions are high-level goal-oriented tasks.
- **Sub-tasks**: Break missions into discrete steps targeted at specific nodes.
- **Verification**: Each step must be verified before proceeding to the next in the chain.

## ERROR HANDLING
- **OS Error 216**: Typically indicates a spawning failure. In RoboFang context, ensure `python -m robofang.main` is used for the bridge and all environment variables are correctly inherited.
- **Node Unreachable**: If a node fails a heartbeat, mark it as 'zombie' in the registry and alert the supervisor.

## DESIGN PHILOSOPHY
- **SOTA Aesthetics**: Interfaces must be premium, using dark mode, glassmorphism, and interactive 3D elements.
- **Materialist Logic**: All decisions are based on observable telemetry and empirical data.
- **Sovereignty**: Local control is prioritized over external dependencies.
