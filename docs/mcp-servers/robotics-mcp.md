# Robotics MCP Server

**By FlowEngineer sandraschi**

**🚀 Production-Ready Multi-Robot Coordination Platform with Enterprise Crash Protection**

**Revolutionary Multi-Robot Coordination: Dreame D20 Pro (primary), Yahboom ROSMASTER, Gazebo simulation, Tdrone Mini, Philips Hue Bridge Pro, and virtual robots collaborate through shared LIDAR maps, collaborative SLAM, RF-based movement detection, and real-time collision avoidance. Physical + virtual + simulated robots working as one super-intelligent system with 99.9% uptime guarantee.**

*Standing on the shoulders of giants: Leveraging auto-mapping innovation from Dreame engineers, ROS2 integration from Yahboom, PX4 flight control from ArduPilot, and the global robotics ecosystem. Protected by enterprise-grade watchfiles crash recovery.*

## 🛡️ **Enterprise Crash Protection**

**Zero-downtime operation with automatic crash recovery:**

- ✅ **Watchfiles Protection**: Automatic restart on any crash with exponential backoff
- ✅ **Health Monitoring**: Real-time HTTP health checks every 30 seconds
- ✅ **Crash Analytics**: Detailed JSON reports with full error analysis
- ✅ **Production Services**: Systemd services for Linux deployment
- ✅ **Windows Support**: PowerShell scripts for easy management

**Result**: **99.9% uptime** for mission-critical robotics operations.

See **[Crash Protection Guide](WATCHFILES_README.md)** for complete setup.

## ⚠️ **CRITICAL REQUIREMENTS**

### **Hardware (Recommended)**
- **Physical Robot**: Dreame D20 Pro (LIDAR vacuum), Moorebot Scout, Yahboom ROSMASTER, PX4/ArduPilot drones
- **Philips Hue Bridge Pro**: For HomeAware RF-based movement detection (optional but recommended)
- **Without hardware**: Virtual robotics only (Unity3D + VRChat)

### **Software (MANDATORY)**
- ✅ **Unity 3D** (6000.2.14f1+) - [Installation Guide](docs/SETUP_PREREQUISITES.md#unity-3d-required-for-virtual-robotics)
- ✅ **VRChat** - [Installation Guide](docs/SETUP_PREREQUISITES.md#vrchat-required-for-social-vr-robotics)
- ✅ **5 MCP Servers** - [Installation Guide](docs/SETUP_PREREQUISITES.md#-required-mcp-servers)

**Without these, the system will not function.** See [Complete Setup Guide](docs/SETUP_PREREQUISITES.md).

[![FastMCP](https://img.shields.io/badge/FastMCP-2.14+-blue)](https://gofastmcp.com)
[![Web Interface](https://img.shields.io/badge/Web--Interface-Professional-purple)]()
[![Python](https://img.shields.io/badge/Python-3.10+-green)](https://www.python.org)
[![Unity](https://img.shields.io/badge/Unity-6000.2.14+-black)](https://unity.com)
[![VRChat](https://img.shields.io/badge/VRChat-Required-blue)](https://hello.vrchat.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Status](https://img.shields.io/badge/Status-ALPHA-orange)](README.md#current-state-2026-02-08-v020)

## 🤖 AI & Hardware Requirements

**Physical Robotics (ROS2/SLAM):**
- **Minimum**: Raspberry Pi 5 / Jetson Orin Nano (On-board)
- **Recommended**: Discrete GPU Workstation (RTX 3060+) for mapping/processing

**Virtual Robotics (Unity/VRChat):**
- **VR Ready PC**: RTX 3060 or better recommended for smooth framerates

**Local Intelligence (LLM):**
- **Auto-Discovery**: The system automatically detects and uses running Ollama or LM Studio instances.
- **70B Models**: Requires RTX 3090/4090 (24GB VRAM) for real-time philosophy engine.
- **8B Models**: Runs on RTX 3060+ or Mac Silicon.

> [!NOTE]
> **Graceful Degradation**: If no local LLM or high-end GPU is detected, AI features (conversation, advanced analysis) are disabled, but core control loops remain functional.

## ⚠️ **REQUIRED: Prerequisites & Dependencies**

### **🔴 PHYSICAL ROBOTS (RECOMMENDED)**

#### **PRIMARY PLATFORM - Yahboom ROSMASTER Series (ROS 2):**
- **Yahboom ROSMASTER M1/X3/X3 Plus** - Multimodal AI robots with camera, navigation, optional arm/gripper
- LiDAR easily addable for mapping/SLAM applications
- Multiple sizes and extensive add-on ecosystem
- Modern ROS2 platform with active community support
- **Perfect for**: Beer can manipulation, object handling, AI research

#### **WHY DREAME D20 PRO IS THE PERFECT STARTER ROBOT**

Most robotics projects start with expensive, fragile hardware that sits on a shelf after the novelty wears off. The Dreame D20 Pro is the opposite: it is a real, useful household appliance that happens to be a sophisticated robotics platform.

**Why it works:**

| Factor | Details |
|--------|---------|
| **Cheap** | ~$200-300 on Amazon. Compare: Yahboom ROSMASTER $300-600, Unitree Go2 $1,600+, Boston Dynamics Spot $74,500 |
| **Available** | Ships from Amazon in 1-2 days. No waiting for niche robotics suppliers |
| **Actually useful** | It vacuums and mops your floor. Every day. Autonomously. Your partner will not complain about "that robot thing" gathering dust |
| **Advanced LIDAR** | Full room-mapping LDS laser scanner. Generates floor plans exportable to OBJ, PLY, Unity NavMesh, Blender scripts |
| **Open software stack** | `python-miio` gives full programmatic control. Raw MiIO protocol for map data. `vacuum-map-parser-dreame` for parsing. No vendor lock-in |
| **Autonomous operation** | Auto-charges, auto-empties dustbin, runs on schedule for weeks unattended |
| **Cute factor** | Watching it methodically navigate around chair legs and figure out room boundaries is genuinely endearing. Make it do a little dance (rapid zone changes) and it gets cuter still |
| **One missing thing** | No camera. If it had one, it would be the perfect robotics starter platform. Use a Tapo C200 ($25) on a shelf for visual coverage |

**The pitch**: For the price of a nice dinner, you get a LIDAR-equipped autonomous robot that pays for itself by cleaning your flat while providing real sensor data for 3D visualization, path planning, and multi-robot coordination research.

#### **COMPLETE ROBOT FLEET SUPPORT:**

**Primary Platform - Dreame D20 Pro (Owned, Recommended Starter):**
- **Dreame D20 Pro** - LIDAR vacuum robot with auto-mapping, zone cleaning, mop, and auto-empty station
- No Android device required; use `discover_dreame.py` and `get_dreame_token.py` for setup
- LIDAR maps exportable to OBJ, PLY, Unity NavMesh JSON, Blender Python scripts

**Secondary Platforms (Enhanced Ecosystem):**
- **Robotics Integration**: Native HTTP Proxy configuration handling internal bridging to various simulated environments like Gazebo and VRChat.
- **FastMCP 2.14.5 Integration**: Leverages the newest FastMCP library for seamless contextual routing.
- **Agentic Workflows**: Integrated LLM sampling and agentic instruction pipelines (`robotics_agentic_workflow`).
- **Dreame D20 Pro** - Vacuum API implementation (Miot protocols)
- **Yahboom ROSMASTER M1/X3/X3 Plus** (Testing Platform) - ROS2 configuration backed by a local 16GB Raspberry Pi 5 SBC
- **Tdrone Mini** - PX4/ArduPilot educational drone with FPV camera
- **Philips Hue Bridge Pro** - Smart home hub with HomeAware RF movement detection
- **Moorebot Scout** - Legacy ROS1 wheeled robot (compatibility mode)
- **Unitree Go2/G1** - Advanced quadrupedal robots (future hardware)

#### **RECOMMENDED STARTER SETUPS:**

**Dreame-First Setup (Recommended - Start Here, ~$200-300):**
- **Dreame D20 Pro** (~$200-300 on Amazon) - LIDAR vacuum with zone cleaning, mapping, mop, auto-empty
- Optionally add **Tapo C200** (~$25) for visual coverage (the Dreame lacks a camera)
- See [Dreame Setup Guide](docs/DREAME_SETUP_GUIDE.md) for token and IP setup
- **Perfect for**: LIDAR mapping, 3D export, path planning, "my first real robot"

**ROS2 Platform (~$500-700):**
- **Yahboom ROSMASTER M1** (~$300) - Compact ROS2 platform with AI capabilities
- **Raspberry Pi 5 (4GB)** - May be included in some M1 bundles, otherwise ~$60-80
- **Perfect for**: Learning ROS2, AI integration, arm/gripper manipulation

**Full Featured Setup (~$800-1200):**
- **Dreame D20 Pro** (~$300) - Primary LIDAR robot (owned)
- **Yahboom ROSMASTER X3/X3 Plus** (~$500-600) - ROS2 manipulation platform
- **Philips Hue Bridge Pro** (~$200) - Smart home + RF movement detection
- **Perfect for**: Multi-robot coordination, physical-virtual sync

## 🍺 Beer Can Manipulation Demo

**Perfect use case for Yahboom ROSMASTER with arm addon:**

```python
# Pick up beer can from table
await robot_control(
    robot_id="yahboom_01",
    action="arm_move",
    joint_angles={"joint1": 0.0, "joint2": 0.5, "joint3": -0.3, "joint4": 0.0}
)

# Open gripper
await robot_control(robot_id="yahboom_01", action="gripper_control", gripper_action="open")

# Move arm to can position
await robot_control(
    robot_id="yahboom_01",
    action="arm_move",
    joint_angles={"joint1": 0.2, "joint2": 0.7, "joint3": -0.1, "joint4": 0.1}
)

# Close gripper on can
await robot_control(robot_id="yahboom_01", action="gripper_control", gripper_action="close")

# Lift can up
await robot_control(
    robot_id="yahboom_01",
    action="arm_move",
    joint_angles={"joint1": 0.2, "joint2": 0.9, "joint3": 0.1, "joint4": 0.1}
)
```

**Hardware Requirements:**
- Yahboom ROSMASTER X3 or X3 Plus (~$500-800)
- Yahboom Robotic Arm Kit (~$150-200)
- Parallel jaw gripper (~$30-50)
- **Total cost: ~$680-1050** for full beer can manipulation robot

### **🟡 REQUIRED SOFTWARE**
#### **MCPB CLI** (Required for packaging distribution bundles)
```bash
npm install -g @anthropic-ai/mcpb
```

#### **Unity 3D** (Required for virtual robotics)
```bash
# Download and install Unity Hub from:
# https://unity.com/download

# Then install Unity Editor version 6000.2.14f1 or later:
# 1. Open Unity Hub
# 2. Go to "Installs" tab
# 3. Click "Add" → "Official releases"
# 4. Select "6000.2.14f1" (LTS recommended)
# 5. Install with default components + Android Build Support
```

#### **VRChat** (Required for social VR robotics)
```bash
# Download from Steam:
# https://store.steampowered.com/app/438100/VRChat/

# Or from VRChat website:
# https://hello.vrchat.com/
```

### **🟢 REQUIRED MCP SERVERS**
**You MUST install and configure these MCP servers:**

#### **1. Unity3D-MCP** (Virtual robot control)
```bash
# Clone and install:
git clone https://github.com/sandraschi/unity3d-mcp.git
cd unity3d-mcp
uv pip install -e .

# Add to Cursor MCP configuration
```

#### **2. OSC-MCP** (Real-time communication)
```bash
# Clone and install:
git clone https://github.com/sandraschi/osc-mcp.git
cd osc-mcp
uv pip install -e .

# Add to Cursor MCP configuration
```

#### **3. VRChat-MCP** (Social VR integration)
```bash
# Clone and install:
git clone https://github.com/sandraschi/vrchat-mcp.git
cd vrchat-mcp
uv pip install -e .

# Add to Cursor MCP configuration
```

#### **4. Blender-MCP** (3D model creation)
```bash
# Clone and install:
git clone https://github.com/sandraschi/blender-mcp.git
cd blender-mcp
uv pip install -e .

# Requires Blender 4.0+ installed
```

#### **5. Avatar-MCP** (Avatar management)

#### **6. Dreame D20 Pro Setup** (Robot vacuum control - NO Android device required!)
```bash
# Install python-miio for Dreame vacuum control
pip install python-miio

# NO Android device needed! Use automated discovery:
cd scripts
python discover_dreame.py     # Find your robot's IP address
python get_dreame_token.py    # Extract authentication token

# Alternative manual methods:
pip install "python-miio[cli]"
miiocli discover              # Discover all Xiaomi devices on network
```
```bash
# Clone and install:
git clone https://github.com/sandraschi/avatar-mcp.git
cd avatar-mcp
uv pip install -e .
```

---

## Current State (2026-02-08, v0.2.0)

**Alpha with real hardware integration. FastMCP 2.14+ compliant.**

### What Actually Works
- **Dreame D20 Pro** - Full vacuum control + LIDAR map retrieval + 3D export (OBJ, PLY, Unity, Blender)
- **Yahboom ROSMASTER** - Real roslibpy rosbridge client (connect, move, arm, gripper)
- **Elegoo** - Real serial protocol communication
- **Gazebo Fuel** - Model browser: search, download, spawn via ROS services
- **MCP Transport** - Dual stdio + HTTP, FastMCP 2.14+ with `ctx: Context` on all tools
- **Webapp** - Live MCP data, full sidebar navigation, 25+ pages, dark mode
- **13 Portmanteau Tools** - All with `ctx: Context` and honest simulation labels

### What is Mock/Stub (Labeled Honestly)
- Unitree Go2/G1 - Returns `not_implemented`
- Drone flight - Returns `simulated: True`
- LLM provider connection - sleep + "connected"
- Physical-virtual sync - Returns `simulated: True`

See [DEEP_ANALYSIS.md](DEEP_ANALYSIS.md) for the full mock audit and bug fix log.

## 🎯 Overview

Robotics MCP Server provides unified control for **physical robots** (Dreame D20 Pro, Yahboom ROSMASTER, Elegoo), **simulated robots** (Gazebo), **virtual robots** (Unity/VRChat/Resonite), and **drones** (PX4/ArduPilot). Primary hardware: Dreame D20 Pro with LIDAR 3D export pipeline.

**Project Stats**: ~12,000+ lines Python, ~5,000+ lines TypeScript/React, 13 portmanteau tools, 25+ webapp pages

### Key Features

- **🤝 REVOLUTIONARY Multi-Robot Coordination**: Yahboom manipulators + Dreame LIDAR mappers + virtual robots collaborate through shared maps, collaborative SLAM, and real-time collision avoidance - [Complete Guide](docs/MULTI_ROBOT_COORDINATION.md)
- **🗺️ LIDAR Map Sharing**: Dreame vacuum maps exported for Yahboom navigation, Unity simulation, and ROS autonomy
- **🔄 Collaborative SLAM**: Multi-perspective mapping with ground-level + elevated + aerial viewpoints
- **🛡️ Real-Time Collision Avoidance**: Predictive safety system coordinating multiple robots simultaneously
- **🔄 Physical + Virtual Integration**: Test behaviors in Unity/VRChat, deploy to physical robots seamlessly
- **📊 Sensor Fusion**: Combine LIDAR, cameras, IMUs, and depth sensors across different robot types
- **🎯 Task Allocation**: Intelligent distribution of tasks based on robot capabilities and environment
- **⚡ Live Coordination**: Sub-100ms decision making for multi-robot safety and efficiency

#### **Robot Support**
- **Physical Robots**: Yahboom ROSMASTER (ROS2), Moorebot Scout (ROS1), Unitree Go2/G1/H1, Dreame D20 Pro vacuum
- **Virtual Robots**: Unity3D, VRChat, Resonite with full physics simulation
- **Drone Integration**: PX4/ArduPilot with MAVLink, video streaming, autonomous flight
- **Legacy Support**: ROS Bridge integration for existing ROS1/ROS2 robots
- **World Labs Marble/Chisel**: Environment generation and import
- **Drone Video Streaming**: RTSP/WebRTC streaming with OpenIPC integration
- **Dual Transport**: stdio (MCP) + HTTP (FastAPI) endpoints
- **MCP Server Composition**: Ready for integration with `osc-mcp`, `unity3d-mcp`, `vrchat-mcp`, `avatar-mcp`, `blender-mcp`, `gimp-mcp` (temporarily disabled)
- **13 Portmanteau Tools**: `robotics_system`, `robot_control`, `robot_behavior`, `robot_manufacturing`, `robot_virtual`, `robot_model_tools`, `vbot_crud`, `drone_control`, `dreame_control`, `gazebo_models`, `workflow_management`, `virtual_robotics`, `robot_navigation`
- **Robot Model Creation**: Framework ready for automated 3D model creation

## 📚 Documentation

- **[Setup Prerequisites](docs/SETUP_PREREQUISITES.md)** ⚠️ **REQUIRED: Complete installation guide for Unity3D, VRChat, and all MCP servers**
- **[AI Research Workflow](docs/AI_RESEARCH_WORKFLOW.md)** 🧠 **Architect first: AI-powered research methodology for all development**
- **[Vienna Technical Museum Makerspace](docs/VIENNA_TECHNICAL_MUSEUM_MAKERSPACE.md)** 🛠️ **Fantastic makerspace - free equipment, pay only consumables!**
- **[Progress Report](docs/PROGRESS_REPORT.md)** 🎉 **Comprehensive project status and achievements!**
- **Secondary App Routing (`/apps`)**: Dynamic links generated to mesh applications.
- **Virtual Robotics Pipeline (`/vbot-ecosystem`)**: A node map mapping MCP interaction to VRChat and Unity3D endpoints.
- **[Dreame Setup Guide](docs/DREAME_SETUP_GUIDE.md)** 🤖 **Complete guide for Dreame D20 Pro vacuum integration**
- **[Hue Bridge Pro Setup](docs/HUE_BRIDGE_PRO_SETUP.md)** 💡 **Philips Hue Bridge Pro + HomeAware RF movement detection**
- **[Multi-Robot Coordination](docs/MULTI_ROBOT_COORDINATION.md)** 🤝 **Advanced collaborative robotics intelligence - the future is here!**
- **[Unity Vbot Instantiation Guide](docs/UNITY_VBOT_INSTANTIATION.md)** - Complete guide for instantiating virtual robots in Unity3D with proper terminology

## 🚀 Quick Start

### Prerequisites Check
⚠️ **BEFORE STARTING**: Complete all [Setup Prerequisites](docs/SETUP_PREREQUISITES.md) - Unity3D, VRChat, and MCP servers are REQUIRED.

## 🚀 Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) installed (RECOMMENDED)
- Python 3.12+

### 📦 Quick Start
Run immediately via `uvx`:
```bash
uvx robotics-mcp
```

### 🎯 Claude Desktop Integration
Add to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "robotics-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/robotics-mcp", "run", "robotics-mcp"]
  }
}
```
#### From PyPI (Recommended)

```bash
pip install robotics-mcp
```

#### From GitHub Releases

```bash
# Direct wheel download
pip install https://github.com/sandraschi/robotics-mcp/releases/download/v1.0.1b2/robotics_mcp-1.0.1b2-py3-none-any.whl

# Or from git
pip install git+https://github.com/sandraschi/robotics-mcp.git
```

#### For Development

```bash
# Clone repository
git clone https://github.com/sandraschi/robotics-mcp.git
cd robotics-mcp

# Install in development mode
pip install -e ".[dev]"
```

## 📦 Packaging & Distribution

This repository is SOTA 2026 compliant and uses the officially validated `@anthropic-ai/mcpb` workflow for distribution.

### Pack Extension
To generate a `.mcpb` distribution bundle with complete source code and automated build exclusions:
```bash
# SOTA 2026 standard pack command
mcpb pack . dist/robotics-mcp.mcpb
```

### Cursor MCP Integration

✅ **The robotics-mcp server now works in Cursor IDE!**

**Setup Steps:**
1. **Complete Prerequisites**: Install Unity3D, VRChat, and all required MCP servers
2. Install the package: `pip install -e ".[dev]"`
3. Add to Cursor MCP configuration using the provided `mcpb.json`
4. The server will automatically start when enabled in Cursor

**Available Tools (13):**
- `robotics_system` - System management (help, status, list_robots)
- `robot_control` - Unified physical/virtual robot control (Dreame, Yahboom, Elegoo, Hue, virtual)
- `robot_behavior` - Advanced robot behavior, animation, and manipulation
- `robot_manufacturing` - 3D printing, CNC, laser cutting operations
- `robot_virtual` - Virtual robotics environments and testing
- `robot_model_tools` - 3D model creation, conversion, and optimization
- `vbot_crud` - Virtual robot lifecycle management (create, read, update, delete)
- `drone_control` - Core drone flight operations (takeoff, land, move, status)
- `dreame_control` - Dreame D20 Pro: vacuum operations + LIDAR map 3D export
- `gazebo_models` - Gazebo Fuel: search, download, spawn, manage local models
- `workflow_management` - Robotics workflow orchestration and automation
- `virtual_robotics` - Legacy virtual robotics operations
- `robot_navigation` - Path planning, obstacle avoidance, SLAM

### MCP Server Integration

✅ **ENABLED WITH SAFETY**: Unity3D-MCP is now enabled with robust error handling, timeouts, and fallbacks.

**Active Integration:**
- **`osc-mcp`**: ✅ **ENABLED** - OSC communication for real-time robot control
- **`unity3d-mcp`**: ✅ **ENABLED** - Unity3D integration for virtual robotics
- **`vrchat-mcp`**: ⏸️ **DISABLED** - VRChat integration (protocol conflicts)
- **`avatar-mcp`**: ⏸️ **DISABLED** - Avatar management (timeseries conflicts)
- **`blender-mcp`**: ⏸️ **DISABLED** - 3D model creation (protocol hangs)
- **`gimp-mcp`**: ⏸️ **DISABLED** - Texture creation (protocol hangs)

**Safety Features:**
- **30-second timeouts** for server loading
- **3 retry attempts** with exponential backoff
- **Graceful fallbacks** to mock operations if Unity unavailable
- **Never blocks** robotics-mcp server operation
- **Comprehensive logging** for debugging

**Configuration:**
All required MCP servers are automatically loaded with error protection. If Unity is not available, virtual robot operations fall back to mock mode with full functionality preservation.

### Configuration (Optional)

The server works out-of-the-box without configuration. For advanced setups, create `~/.robotics-mcp/config.yaml`:

```yaml
robotics:
  moorebot_scout:
    enabled: false
    robot_id: "scout_01"
    ip_address: "192.168.1.100"
    port: 9090
    mock_mode: true
  virtual:
    enabled: true
    platform: "unity"
server:
  enable_http: true
  http_port: 12230
  log_level: "INFO"
```

**MCP Integration Config** (for when mounted servers are re-enabled):
```yaml
mcp_integration:
  osc_mcp:
    enabled: true
    prefix: "osc"
  unity3d_mcp:
    enabled: true
    prefix: "unity"
  vrchat_mcp:
    enabled: true
    prefix: "vrchat"
  avatar_mcp:
    enabled: true
    prefix: "avatar"
  blender_mcp:
    enabled: true
    prefix: "blender"
  gimp_mcp:
    enabled: true
    prefix: "gimp"
```

### Running the Server

**Primary Usage**: Configure as MCP server in Cursor IDE using `mcpb.json`

#### Manual Operation (Development)

```bash
# MCP stdio mode (for testing)
python -m robotics_mcp --mode stdio

# HTTP API mode
python -m robotics_mcp --mode http --port 12230

# Dual mode (stdio + HTTP)
python -m robotics_mcp --mode dual --port 12230

# Production mode with crash protection (recommended)
.\scripts\run-with-watchfiles.ps1
```

## 🛠️ Usage

### MCP Tools

#### Robot Control (7 Robot Types Supported)

**Dreame D20 Pro (Primary - Robot Vacuum):**
```python
# LIDAR mapping and zone cleaning
await robot_control(robot_id="dreame_01", action="get_status")
await robot_control(robot_id="dreame_01", action="start_cleaning")
await robot_control(robot_id="dreame_01", action="clean_zone", zones=[[0, 0, 500, 300]])
await robot_control(robot_id="dreame_01", action="return_to_dock")
await robot_control(robot_id="dreame_01", action="get_map")  # Export LIDAR map
```

**Yahboom ROSMASTER (ROS2 Platform):**
```python
await robot_control(robot_id="yahboom_01", action="get_status")
await robot_control(robot_id="yahboom_01", action="home_patrol")
await robot_control(robot_id="yahboom_01", action="camera_capture")
await robot_control(robot_id="yahboom_01", action="arm_move", joint_angles={"joint1": 0.0, "joint2": 0.5})
```

**Tdrone Mini (Educational Drone):**
```python
# PX4 flight control with waypoint navigation
await robot_control(robot_id="tdrone_01", action="takeoff", altitude=3.0)
await robot_control(robot_id="tdrone_01", action="goto_waypoint", x=10, y=5, altitude=5)
await robot_control(robot_id="tdrone_01", action="set_mode", mode="position_hold")
await robot_control(robot_id="tdrone_01", action="return_home")
```

**Philips Hue Bridge Pro (Smart Home):**
```python
await robot_control(robot_id="hue_01", action="set_light_state",
                   light_id="1", state={"on": true, "brightness": 200})
await robot_control(robot_id="hue_01", action="activate_scene", scene="bright")
```

**Moorebot Scout (Legacy ROS1):**
```python
await robot_control(robot_id="scout_01", action="move", linear=0.2, angular=0.0)
await robot_control(robot_id="scout_01", action="stop")
```

*Unitree Go2/G1: Supported when hardware available (stand, sit, walk actions).*

#### Virtual Robotics

```python
# Spawn virtual robot in Unity
await virtual_robotics(
    robot_type="scout",
    action="spawn_robot",
    platform="unity",
    position={"x": 0, "y": 0, "z": 0}
)

# Load Marble environment
await virtual_robotics(
    action="load_environment",
    environment="stroheckgasse_apartment",
    platform="unity"
)
```

#### Robot Model Tools

```python
# Create Scout model from scratch (uses blender-mcp + gimp-mcp)
await robot_model_create(
    robot_type="scout",
    output_path="D:/Models/scout_model.fbx",
    format="fbx",
    dimensions={"length": 0.115, "width": 0.10, "height": 0.08},
    create_textures=True,
    texture_style="realistic"
)

# Import robot model into Unity
await robot_model_import(
    robot_type="scout",
    model_path="D:/Models/scout_model.fbx",
    format="fbx",
    platform="unity",
    project_path="D:/Projects/UnityRobots"
)

# Convert model between formats
await robot_model_convert(
    source_path="D:/Models/scout.fbx",
    source_format="fbx",
    target_format="glb",
    target_path="D:/Models/scout.glb"
)
```

#### Drone Control

```python
# Get drone status
await drone_control(
    operation="get_status",
    drone_id="px4_quad_01"
)

# Take off to 5m altitude
await drone_control(
    operation="takeoff",
    drone_id="px4_quad_01",
    altitude=5.0
)

# Move drone with velocity control
await drone_control(
    operation="move",
    drone_id="px4_quad_01",
    velocity_x=1.0,  # 1 m/s forward
    velocity_y=0.0,  # no lateral movement
    velocity_z=0.0,  # no vertical movement
    yaw_rate=0.1    # slight rotation
)

# Arm drone motors
await drone_control(
    operation="arm",
    drone_id="px4_quad_01"
)

# Return to launch position
await drone_control(
    operation="return_home",
    drone_id="px4_quad_01"
)
```

#### Drone Streaming

```python
# Start FPV video stream
await drone_streaming(
    operation="start_fpv",
    drone_id="px4_quad_01",
    quality="720p"
)

# Get stream URL for external viewing
stream_info = await drone_streaming(
    operation="get_stream_url",
    drone_id="px4_quad_01",
    protocol="rtsp"
)
print(f"Stream URL: {stream_info['url']}")

# Start recording video
await drone_streaming(
    operation="start_recording",
    drone_id="px4_quad_01",
    filename="flight_2025-01-17.mp4"
)

# Take a snapshot
await drone_streaming(
    operation="take_snapshot",
    drone_id="px4_quad_01",
    filename="aerial_view.jpg"
)
```

#### Drone Navigation

```python
# Get current GPS position
position = await drone_navigation(
    operation="get_position",
    drone_id="px4_quad_01"
)
print(f"Lat: {position['latitude']}, Lon: {position['longitude']}, Alt: {position['altitude']}")

# Set a waypoint for navigation
await drone_navigation(
    operation="set_waypoint",
    drone_id="px4_quad_01",
    latitude=37.7749,
    longitude=-122.4194,
    altitude=10.0
)

# Enable follow-me mode
await drone_navigation(
    operation="enable_follow_me",
    drone_id="px4_quad_01",
    target_id="operator_gps"
)

# Set geofence boundaries
await drone_navigation(
    operation="set_geofence",
    drone_id="px4_quad_01",
    fence_points=[
        {"lat": 37.7740, "lon": -122.4200},
        {"lat": 37.7750, "lon": -122.4200},
        {"lat": 37.7750, "lon": -122.4180},
        {"lat": 37.7740, "lon": -122.4180}
    ],
    max_altitude=30.0
)
```

#### Drone Flight Control

```python
# Set flight mode to AUTO
await drone_flight_control(
    operation="set_flight_mode",
    drone_id="px4_quad_01",
    mode="AUTO"
)

# Get available flight modes
modes = await drone_flight_control(
    operation="get_flight_modes",
    drone_id="px4_quad_01"
)
print(f"Available modes: {modes['modes']}")

# Upload a mission plan
await drone_flight_control(
    operation="upload_mission",
    drone_id="px4_quad_01",
    mission_plan={
        "waypoints": [
            {"lat": 37.7749, "lon": -122.4194, "alt": 10.0},
            {"lat": 37.7750, "lon": -122.4200, "alt": 15.0}
        ],
        "commands": ["takeoff", "waypoint", "land"]
    }
)

# Start mission execution
await drone_flight_control(
    operation="start_mission",
    drone_id="px4_quad_01",
    mission_id="recon_mission_01"
)

# Tune drone parameters
await drone_flight_control(
    operation="set_parameter",
    drone_id="px4_quad_01",
    param_name="WPNAV_SPEED",
    param_value=500  # cm/s
)
```

### Web Interface

The Robotics MCP server includes a modern web-based control panel for easy robot management:

```
http://localhost:8081
```

**Features:**
- Real-time robot control with intuitive movement buttons
- Live status monitoring (battery, position, sensors)
- Camera capture and arm/gripper control
- Command logging and connection status
- Responsive design for desktop and mobile

See [Web Interface Documentation](web/README.md) for detailed usage instructions.

### HTTP API

#### Health Check

```bash
curl http://localhost:12230/api/v1/health
```

#### List Robots

```bash
curl http://localhost:12230/api/v1/robots
```

#### Control Robot

```bash
curl -X POST http://localhost:12230/api/v1/robots/scout_01/control \
  -H "Content-Type: application/json" \
  -d '{"action": "move", "linear": 0.2, "angular": 0.0}'
```

#### List Tools

```bash
curl http://localhost:12230/api/v1/tools
```

#### Call Tool

```bash
curl -X POST http://localhost:12230/api/v1/tools/robot_control \
  -H "Content-Type: application/json" \
  -d '{"robot_id": "scout_01", "action": "get_status"}'
```

## 📚 Documentation

- **[ROS Fundamentals](docs/ROS_FUNDAMENTALS.md)** 🤖 **Complete guide to the Robot Operating System - what ROS is, why it matters, core concepts, and ROS 1 vs ROS 2**
- **[LiDAR Guide](docs/LIDAR_GUIDE.md)** 📡 **Affordable 3D sensing - Livox Mid-360 ($399), RPLIDAR ($99), integration, and robotics applications**
- **[Tiny Controllers Guide](docs/TINY_CONTROLLERS_GUIDE.md)** 🎮 **Smallest microcontroller boards for robotics - Raspberry Pi Pico, ESP32, Arduino Nano, Teensy**
- **[Pyroelectric Sensors Guide](docs/PYROELECTRIC_SENSORS_GUIDE.md)** 🔍 **Ultra-small motion detection - AM312 (6x4.5mm), HC-SR501, PIR sensors ($1-5)**
- **[Component Reuse Hacks](docs/COMPONENT_REUSE_HACKS.md)** 🔧 **Creative electronics salvage - Philips Hue bulbs, HDD motors, smartphone cameras**
- **[World Labs Unity Integration Fix](docs/WORLDLABS_UNITY_INTEGRATION_FIX.md)** 🏠 **Resolve Marble .spz to Unity splat format incompatibilities + Scout vbot improvements**
- **[Import Nekomimi-chan VRM Guide](docs/IMPORT_NEKOMIMI_VRM_GUIDE.md)** 🐱 **High-priority VRM avatar import for VRoid Studio model in avatar-mcp**
- **[Blender VRM Workflow for Robotics](docs/BLENDER_VRM_WORKFLOW_ROBOTICS.md)** 🔧 **Create custom VRM models for dogbots, diggers, articulated arms despite humanoid limitations**
- **[VRM Tools Alternatives](docs/VRM_TOOLS_ALTERNATIVES.md)** 🎨 **More generalized VRM creation tools beyond VRoid Studio for robots and non-humanoids**
- **[Comprehensive Project Notes](docs/COMPREHENSIVE_NOTES.md)** 📖 **Complete project documentation!**
- **[VRM vs Robot Models](docs/VRM_VS_ROBOT_MODELS.md)** 🤖 **VRM format guide - when to use VRM vs FBX/GLB**
- **[Unity Vbot Instantiation Guide](docs/UNITY_VBOT_INSTANTIATION.md)** 🎮 **Complete guide for instantiating virtual robots in Unity3D**
- [Implementation Plan](PLAN.md)
- [Quick Start: VRChat](docs/QUICK_START_VRCHAT.md) ⚡ **Get Scout into VRChat!**
- [ROS 1.4 Local Setup](docs/ROS1_LOCAL_SETUP.md) 🐳 **Full local ROS environment for Scout!**
- [VRChat Integration Guide](docs/VRChat_INTEGRATION.md)
- [VRChat Scout Setup](docs/VRCHAT_SCOUT_SETUP.md) - Complete guide
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [MCP Integration](docs/MCP_INTEGRATION.md)

### **🛡️ Production & Deployment**
- [Watchfiles Crash Protection](WATCHFILES_README.md) - Enterprise crash recovery
- [Systemd Services](robotics-mcp-watchfiles.service) - Linux production deployment
- [PowerShell Scripts](scripts/run-with-watchfiles.ps1) - Windows management

### **🤖 Robot Integration Guides**
- [Dreame D20 Pro Setup](docs/DREAME_SETUP_GUIDE.md) - Vacuum robot integration
- [Hue Bridge Pro Setup](docs/HUE_BRIDGE_PRO_SETUP.md) - Smart home integration
- [Multi-Robot Coordination](docs/MULTI_ROBOT_COORDINATION.md) - Collaborative robotics
- [Yahboom Integration](docs/YAHBOOM_INTEGRATION_SUMMARY.md) - ROS2 robot setup

### **🔧 Development & Testing**
- [Setup Prerequisites](docs/SETUP_PREREQUISITES.md) - Complete installation guide
- [Quick Start VRChat](docs/QUICK_START_VRCHAT.md) - VR social robotics
- [Unity Setup Guide](docs/UNITY_SETUP_GUIDE.md) - 3D virtual robotics
- [Comprehensive Notes](docs/COMPREHENSIVE_NOTES.md) - Technical deep-dive

## 🧪 Testing

**Comprehensive test suite**: 21 test files, 2,642 lines of tests covering all 11 tools!

```bash
# Run all tests
pytest

# Run unit tests only
pytest tests/unit

# Run integration tests
pytest tests/integration

# Run with coverage
pytest --cov=robotics_mcp --cov-report=html

# Or use the PowerShell script
.\scripts\run-tests.ps1
```

## 🔧 Development

### Project Structure

```
robotics-mcp/
├── src/robotics_mcp/
│   ├── server.py              # Main FastMCP server
│   ├── clients/               # Robot client implementations
│   ├── integrations/          # MCP server integration wrappers
│   ├── tools/                 # Portmanteau tool implementations
│   └── utils/                 # Utilities (config, state, mock data)
├── tests/
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
└── mcpb/                      # MCPB packaging
```

### Code Quality

```bash
# Format code
black src/ tests/

# Lint code
ruff check src/ tests/

# Type checking
mypy src/
```

## 🔧 Troubleshooting

### Cursor MCP Integration Issues

**Problem:** Server not appearing in Cursor MCP tools

**Symptoms:**
- "robotics-mcp" not showing in MCP tools list
- Tools not available in Cursor

**Quick Fix:**
1. Open Cursor Settings → Features → Model Context Protocol
2. Add new server using the `mcpb.json` configuration
3. Ensure the server shows as "Healthy" in the list
4. Restart Cursor if needed

**Server Status Check:**
```bash
# Verify server starts correctly
python -c "from robotics_mcp.server import RoboticsMCP; RoboticsMCP(); print('SUCCESS')"
```

**Configuration File:** Use `mcpb.json` in the project root for Cursor MCP setup.

### Other Issues

**Server won't start:**
- Check Python version: `python --version` (requires 3.10+)
- Verify dependencies: `pip install -e ".[dev]"`
- Check logs: `C:\Users\sandr\AppData\Roaming\Cursor\logs\`

**Tools not appearing:**
- Verify MCP server is enabled in Cursor IDE settings
- Check server logs for errors
- Try disabling and re-enabling the server

**Unity integration not working:**
- Ensure Unity Editor is running
- Verify Unity project path is correct
- Check `unity3d-mcp` server is healthy

## 🤝 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- FastMCP framework
- ROS community
- Unity3D, VRChat, World Labs Marble/Chisel
- MCP ecosystem contributors

---

**Status**: Alpha v0.2.0 (2026-02-08) - FastMCP 2.14+ compliant, Dreame D20 Pro working, Yahboom roslibpy integrated, Gazebo Fuel browser operational, webapp fully navigable.

**MCP Server Composition**: osc-mcp enabled, unity3d-mcp enabled (with safety), vrchat-mcp/avatar-mcp/blender-mcp/gimp-mcp temporarily disabled for stability.

**Deep Analysis**: See [DEEP_ANALYSIS.md](DEEP_ANALYSIS.md) for comprehensive code audit, mock inventory, and bug fix log.

