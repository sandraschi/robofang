# Getting Started with RoboFang

Welcome to the bridge of your sovereign intelligence fleet. RoboFang is designed to give you total control over your local and remote MCP infrastructure.

## Common Workflows

### 1. Checking Fleet Readiness
"RoboFang, what's the status of the Alsergrund fleet?"
- RoboFang will poll all active nodes using `get_fleet_status`.
- It will report on health, port occupancy, and active capabilities.

### 2. Orchestrating a Creative Mission
"Analyze the current security logs and create a 3D visualization of the intruders in Blender."
- Step 1: `monitoring.get_logs()`
- Step 2: `advanced-memory.summarize_logs()`
- Step 3: `blender.generate_scene(summary)`

### 3. Managing "Weak" Nodes
If a node is marked as `weak` (like `readly-mcp`), RoboFang will treat it with caution, prioritizing more stable nodes for critical missions but keeping it available for lightweight analysis.

## Visual Excellence
The RoboFang dashboard at `http://localhost:10864` provides a premium 3D Point Cloud view of your nodes, showing them floating in space as active neurons in your digital brain.

## Troubleshooting
If you see a "Spawn Error" or "OS Error 216", it usually means the bridge is having trouble spinning up a new service. Check your Python architecture and ensure port 10870 is clear of "squatters".
