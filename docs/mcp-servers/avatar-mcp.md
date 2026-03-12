# AvatarMCP

**By FlowEngineer sandraschi**

> FastMCP 2.14.3+ compatible VRM avatar management and animation server with conversational capabilities, SEP-1577 sampling support, and VRChat OSC integration

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://docs.astral.sh/ruff/)
[![FastMCP 2.14.3](https://img.shields.io/badge/FastMCP-2.14.3+-brightgreen)](https://fastmcp.readthedocs.io/)
[![VRChat OSC](https://img.shields.io/badge/VRChat-OSC-9cf)](docs/VRChat_OSC_Integration_Guide.md)
[![Portmanteau Tools](https://img.shields.io/badge/Tools-Portmanteau-blueviolet)](docs/architecture/PORTMANTEAU_TOOLS_PLAN.md)

## 🚀 Features

### Core Features

- **Portmanteau Tools Architecture**: Consolidated 16 portmanteau tools with FastMCP 2.14.3 sampling capabilities
  - Exposes only portmanteau tools to MCP (no raw core-tool list); bootstrap via `system_monitor(operation="initialize")`
  - Reduces tool explosion from 28 individual tools to 16 unified interfaces
  - Operation-based design with comprehensive multiline docstrings
  - Clean, maintainable architecture with focused tool classes

- **FastMCP 2.14.3 Compatible**: Fully implements the MCP protocol with sampling capabilities (SEP-1577) for agentic workflows
- **Agentic Sampling Workflows**: LLM-driven orchestration of complex avatar behaviors without manual sequencing
- **VRM 2.0 Support**: Load and manage VRM 2.0 avatar models with real-time manipulation
- **VRChat OSC Integration**: Seamless communication with VRChat for avatar control
- **Advanced Animation System**: Play, blend, and manage animations with support for loops, varying speeds, and real-time recording
- **Advanced Bone Control**: Precise control over avatar bones with local/world space transforms and hierarchical manipulation
- **Morph Target Control**: Fine-grained control over blend shapes and morph targets with batch updates
- **Unity Desktop Integration**: Full Unity desktop avatar control with window management
- **Chat System**: Interactive chatbot functionality with session management

### Secondary Features

- **MCPB Packaging**: Easy deployment and integration with MCP-compatible applications
- **Type Annotated**: Fully type-annotated code for better development experience
- **Modular Design**: Clean architecture with separate components for VRM loading, animation, and MCP server
- **System Monitoring**: Comprehensive system health and diagnostics
- **Debug Tools**: Built-in debugging and testing utilities

## 🏗️ Portmanteau Tools Architecture

AvatarMCP uses a revolutionary portmanteau tools architecture that consolidates related functionality into unified interfaces, leveraging FastMCP 2.14.3 sampling capabilities for agentic workflows.

### Benefits

- **50% Tool Reduction**: From 28 individual tools to 16 consolidated portmanteau tools with agentic sampling
- **Better Organization**: Related functionality logically grouped together
- **Easier Maintenance**: Single class per functional area
- **Improved Discoverability**: Clearer tool purposes and operations
- **Standards Compliance**: FastMCP 2.12 compliant with multiline docstrings
- **Cleaner API**: More intuitive tool structure with operation-based design

### Architecture Overview

The server exposes only the 16 portmanteau tools. **Bootstrap first** with `system_monitor({"operation": "initialize"})` (optional: `models_dir`); then use other portmanteau tools. Each portmanteau tool uses an operation-based design:

```python
# Example: avatar_manager tool
await avatar_manager({
    "operation": "load",           # Operation type
    "path": "models/avatar.vrm",   # Operation-specific parameters
    "make_active": True
})

await avatar_manager({
    "operation": "list"            # Different operation, same tool
})
```

### Tool Categories

1. **Core Tools** (6 implemented): Essential functionality
2. **Management Tools** (5 implemented): System and resource management  
3. **Advanced Tools** (5 implemented): Specialized functionality

For detailed architecture documentation, see [Portmanteau Tools Plan](docs/architecture/PORTMANTEAU_TOOLS_PLAN.md).

## 📚 Documentation

### Core Components

- `MCPServer`: FastMCP 2.13.0-compatible server implementation
- `VRChatOSC`: OSC integration with VRChat for avatar control
- `VRMModel`: VRM 2.0 model loading and management
- `AnimationController`: Manage and play animations on avatars
- `MCPTools`: MCP command handlers for avatar control
- `AvatarSamplingTool`: Agentic workflow orchestration using FastMCP 2.14.3 sampling

### Feature Guides

- **[Sampling Workflows Guide](SAMPLING_WORKFLOWS_GUIDE.md)**: Complete guide to agentic sampling workflows
  - Workflow examples and best practices
  - Creative applications and use cases
  - Technical implementation details
  - Troubleshooting and optimization tips

## 💬 Available Prompts

AvatarMCP supports natural language interaction through the following commands:

### Avatar Management
- **Load Avatar**: "Load the VRM model from {path} as {avatar_name}"
- **Unload Avatar**: "Unload the avatar named {avatar_name}"
- **List Avatars**: "Show all loaded avatars"
- **Set Active Avatar**: "Set {avatar_name} as the active avatar"

### Animation Control
- **Play Animation**: "Play {animation_name} on {avatar_name} at {speed}x speed"
- **Stop Animation**: "Stop current animation on {avatar_name}"
- **Pause Animation**: "Pause animation on {avatar_name}"
- **Resume Animation**: "Resume paused animation on {avatar_name}"
- **Blend Animations**: "Blend from {anim1} to {anim2} over {duration} seconds on {avatar_name}"
- **Set Animation Parameter**: "Set {parameter} to {value} on {avatar_name}'s animation"

### Bone Control
- **Rotate Bone**: "Rotate {bone_name} to X:{x} Y:{y} Z:{z} on {avatar_name}"
- **Reset Bone**: "Reset {bone_name} rotation on {avatar_name}"
- **List Bones**: "Show all bones for {avatar_name}"

### Morph/BlendShape Control
- **Set Morph**: "Set {morph_name} to {value} on {avatar_name}"
- **Reset Morph**: "Reset {morph_name} on {avatar_name}"
- **List Morphs**: "Show available morphs for {avatar_name}"

### Export
- **Export Avatar**: "Export {avatar_name} to {file_path} as {format}"
- **Take Screenshot**: "Take a screenshot of {avatar_name} and save to {file_path}"

### System
- **Get System Info**: "Show system information"
- **Get Logs**: "Show recent logs"
- **Search Web**: "Search the web for {query}"
- **Query Knowledge Base**: "Search knowledge base for {query}"

### Advanced
- **Send OSC Message**: "Send OSC message {address} with {value} to {ip}:{port}"
- **Run Script**: "Run script {script_name} with parameters {params}"

### 3D Visualization & Controls

AvatarMCP features a 3D viewport system for avatar manipulation:

- **Interactive 3D Viewport**: Real-time rendering of your avatar with multiple camera angles
- **View Controls**:
  - Rotate: Click and drag with left mouse button
  - Pan: Right-click and drag
  - Zoom: Mouse wheel or right-click + drag up/down
  - Reset View: Double-click the viewport
- **Visualization Modes**:
  - Solid: Full textured rendering
  - Wireframe: See underlying mesh structure
  - Shaded: Flat shading for better shape visualization
  - X-Ray: See through the model for complex rigs

### Advanced Avatar Controls

- **Bone Control**: Precise manipulation of individual bones with support for local and world space transformations
- **Morph Target Control**: Fine-grained control over blend shapes and morph targets with real-time preview
- **Export Tools**: Export avatars to various formats including FBX and Unity packages

For detailed documentation, see [AVATAR_CONTROLS.md](docs/AVATAR_CONTROLS.md).

### MCP Protocol Support

AvatarMCP implements the following portmanteau tools leveraging FastMCP 2.14.3 sampling capabilities:

#### Core Portmanteau Tools

- **`avatar_manager`**: Comprehensive avatar lifecycle management
- **`animation_manager`**: Animation control, sequences, and layering
- **`emotion_manager`**: Emotional states and personality profiles
- **`audio_manager`**: Audio playback and synthesis
- **`behavior_manager`**: AI behavior and adaptation
- **`chat_manager`**: Chat session management
- **`system_monitor`**: System health and diagnostics

#### Advanced Portmanteau Tools

- **`avatar_sampling`**: Agentic workflow orchestration (SEP-1577)
- **`collaboration_manager`**: Multi-user synchronization
- **`content_manager`**: Content creation and publishing
- **`interaction_manager`**: Tactical triggers and gestures
- **`performance_manager`**: Optimization and profiling
- **`unity_integration`**: Unity desktop avatar control
- **`unity_window_manager`**: Unity window control
- **`unity_config_manager`**: Unity configuration management
- **`server_controller`**: Server lifecycle management

## 🎭 Agentic Sampling Workflows (FastMCP 2.14.3)

AvatarMCP introduces **agentic sampling workflows** - a revolutionary feature leveraging FastMCP 2.14.3's SEP-1577 "sampling with tools" specification. This enables LLMs to autonomously orchestrate complex avatar behaviors without manual step-by-step programming.

### Key Benefits

- **🎪 Intelligent Choreography**: AI creates seamless multi-step performances
- **⚡ Efficiency Gains**: Reduces 10+ tool calls to single workflow requests
- **🧠 Emotional Intelligence**: LLM understands timing, flow, and emotional context
- **🎨 Complex Behaviors**: Sophisticated avatar interactions and storytelling

### Sampling Workflow Examples

```python
# Emotional performance
await avatar_agentic_workflow({
    "workflow_prompt": "Express happiness with a smile and celebratory gesture",
    "avatar_id": "companion_bot",
    "available_operations": ["set_morph", "play_animation", "control_bone"],
    "max_iterations": 3
})

# Complex dance choreography
await avatar_agentic_workflow({
    "workflow_prompt": "Perform a 30-second joyful dance with emotional transitions",
    "avatar_id": "dancer",
    "available_operations": ["play_animation", "set_emotion", "blend_animations", "wait"],
    "max_iterations": 10,
    "context": {"duration": 30, "style": "joyful"}
})

# Interactive conversation response
await avatar_agentic_workflow({
    "workflow_prompt": "React to surprising good news with excitement and gestures",
    "avatar_id": "listener",
    "available_operations": ["set_emotion", "control_bone", "send_osc"],
    "max_iterations": 4
})
```

### Available Operations for Sampling

The sampling tool can orchestrate these avatar operations:
- `load_avatar` - Load VRM models
- `play_animation` - Trigger animations
- `set_morph` - Control facial expressions
- `control_bone` - Manipulate bone positions
- `send_osc` - Send OSC messages to VRChat
- `set_emotion` - Set emotional states
- `create_sequence` - Build animation sequences
- `blend_animations` - Layer multiple animations
- `get_status` - Check avatar state
- `wait` - Add timing delays

### Technical Implementation

- **SEP-1577 Compliance**: Full implementation of sampling with tools specification
- **Async Orchestration**: Proper timing and sequencing of operations
- **Context Awareness**: Workflow parameters and environmental context
- **Safety Limits**: Configurable iteration limits (1-20) prevent infinite loops
- **Error Recovery**: Graceful handling of operation failures

#### Usage Examples

```python
# Avatar management
await avatar_manager({
    "operation": "load",
    "path": "models/my_avatar.vrm",
    "make_active": True
})

# Animation control
await animation_controller({
    "operation": "play",
    "name": "wave",
    "loop": True,
    "speed": 1.2
})

# OSC communication
await osc_communicator({
    "operation": "send",
    "address": "/avatar/parameters/Emotion",
    "value": 0.8
})

# Unity integration
await unity_integration({
    "operation": "set_expression",
    "expression": "Happy",
    "strength": 0.9
})
```

#### Sampling Workflow Examples

```python
# Agentic emotional performance
await avatar_agentic_workflow({
    "workflow_prompt": "Express genuine happiness with a warm smile and friendly gesture",
    "avatar_id": "companion_bot",
    "available_operations": ["set_morph", "play_animation", "control_bone"],
    "max_iterations": 3
})

# Complex choreography with timing
await avatar_agentic_workflow({
    "workflow_prompt": "Perform a 20-second celebratory dance with emotional peaks",
    "avatar_id": "performer",
    "available_operations": ["play_animation", "set_emotion", "blend_animations", "wait"],
    "max_iterations": 8,
    "context": {
        "duration": 20,
        "style": "celebratory",
        "emotional_arc": ["joy", "excitement", "climax"]
    }
})

# Interactive storytelling
await avatar_agentic_workflow({
    "workflow_prompt": "React dramatically to an unexpected plot twist",
    "avatar_id": "character",
    "available_operations": ["set_emotion", "control_bone", "play_animation", "send_osc"],
    "max_iterations": 6,
    "context": {
        "reaction_type": "shock",
        "intensity": "high"
    }
})
```

### Getting Started with Sampling Workflows

1. **Load your avatar** using `avatar_manager` first
2. **Choose appropriate operations** for your workflow goal
3. **Write descriptive prompts** that include timing and emotional context
4. **Start with simple workflows** (3-5 iterations) and scale up
5. **Monitor results** to refine prompts and operation selection

For complete MCP protocol documentation, see [FastMCP Documentation](https://fastmcp.readthedocs.io/).

### VRChat OSC Integration

See [VRChat OSC Integration Guide](docs/VRChat_OSC_Integration_Guide.md) for details on how to configure and use the OSC integration.

## 🚀 Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) installed (RECOMMENDED)
- Python 3.12+

### 📦 Quick Start
Run immediately via `uvx`:
```bash
uvx avatarmcp
```

### 🎯 Claude Desktop Integration
Add to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "avatarmcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/avatar-mcp", "run", "avatarmcp"]
  }
}
```
### Prerequisites

- Python 3.9+
- pip (Python package manager)
- [VRChat](https://vrchat.com/) (for VRChat OSC integration - optional)

### 📦 PyPI Package Install (RECOMMENDED)

**Fastest Installation - Production Ready:**

```bash
pip install avatarmcp
```

**Claude Desktop Integration:**
- Open Claude Desktop
- Settings → MCP Servers
- Add new MCP server:
  ```json
  {
    "mcpServers": {
      "avatarmcp": {
        "command": "avatarmcp"
      }
    }
  }
  ```

### Web dashboard (web_sota)

Optional React dashboard (Vite, port 10792) with API proxy to the backend (10793). From repo root:

```powershell
cd web_sota
npm install
npm run dev
```

Requires `framer-motion` and a valid `APPS_CATALOG` export from `src/common/apps-catalog.ts`. See [CHANGELOG](CHANGELOG.md) for recent web UI fixes.

## 📦 Packaging & Distribution

This repository is SOTA 2026 compliant and uses the officially validated `@anthropic-ai/mcpb` workflow for distribution.

### Pack Extension
To generate a `.mcpb` distribution bundle with complete source code and automated build exclusions:
```bash
# SOTA 2026 standard pack command
mcpb pack . dist/avatar-mcp.mcpb
```

### 🛠️ Other MCP Clients (Cursor, Windsurf, etc.)

```bash
# Install from PyPI (recommended)
pip install avatarmcp

# OR install from source
git clone https://github.com/sandraschi/avatarmcp.git
cd avatarmcp
uv pip install -e .
```

### Dependencies

Core dependencies (automatically installed):

- `python-osc`: For VRChat OSC communication
- `pyvrm`: For VRM model loading and manipulation
- `numpy`: For animation math
- `fastmcp`: MCP protocol implementation

Optional dependencies (for development and testing):

- `fastapi`: For the optional REST API
- `uvicorn`: ASGI server for the REST API

```bash

## 🚀 Quick Start

### Running the Server

```bash
# Start the MCP server
python -m avatarmcp
```

The server will start and listen for MCP commands on stdin/stdout. You can interact with it using any MCP 2.12.0-compatible client.

### Example MCP Commands

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "avatar.load",
  "params": {
    "id": "my_avatar",
    "path": "/path/to/avatar.vrm",
    "scale": 1.0
  }
}

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "animation.play",
  "params": {
    "avatar_id": "my_avatar",
    "animation": "wave_hand",
    "loop": false
  }
}
```

### Optional REST API

For testing purposes, you can start the optional REST API server:

```bash
uvicorn avatarmcp.api:app --host 0.0.0.0 --port 8000
```

**Note:** The REST API is provided for testing and development purposes only and should not be used in production.

```python
from avatarmcp import VRChatAvatarController

import asyncio

async def main():
    # Create and initialize the controller
    controller = VRChatAvatarController("path/to/your/model.vrm")
    await controller.initialize()
    
    try:
        # Set a facial expression
        await controller.osc_integrator.set_expression("happy", 1.0)
        
        # Set a hand gesture
        await controller.osc_integrator.set_gesture("left", "peace")
        
        # Keep the application running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        await controller.close()

asyncio.run(main())

```


### Running the Example

```bash

# Run the VRChat control example


python examples/vrchat_avatar_control.py --vrm path/to/your/model.vrm --demo

```


## ðŸ”§ Configuration

### OSC Settings

By default, AvatarMCP uses these OSC ports:

- **Receive Port**: 9000 (for receiving parameters from VRChat)

- **Send Port**: 9001 (for sending parameters to VRChat)



You can customize these in the `AvatarOSCConfig`:

```python
from avatarmcp import AvatarOSCConfig






config = AvatarOSCConfig(
    receive_port=9000,
    send_port=9001,
    server_ip="127.0.0.1"
)

```


### Parameter Mappings

You can define custom parameter mappings for your avatar:

```python
config.parameter_mappings = {





    "BlendShape.A": "VRC_AA",
    "BlendShape.E": "VRC_E",
    # Add more mappings as needed
}

```


## ðŸ¤– Integration with Other MCP Services

### OSCMCP Integration

AvatarMCP can be integrated with OSCMCP for advanced routing and processing:

```python
from fastmcp import FastMCP





from avatarmcp import AvatarOSCIntegrator

# Initialize MCP client
mcp = FastMCP("http://localhost:8000/mcp")






# Create and start the integrator
integrator = AvatarOSCIntegrator(mcp)





await integrator.start()

# Now you can control the avatar through OSCMCP
await integrator.set_expression("happy", 1.0)





```

## ðŸ“š API Reference

### VRChatOSCServer

Core OSC server for VRChat communication.

**Methods:**

- `start()`: Start the OSC server

- `stop()`: Stop the OSC server


- `set_gesture(hand, gesture, strength=1.0)`: Set a hand gesture

- `set_expression(expression, strength=1.0)`: Set a facial expression


- `set_viseme(viseme, strength=1.0)`: Set a viseme for lip sync

### VRMLoader

Load and parse VRM 2.0 models.

**Methods:**

- `from_file(file_path)`: Load a VRM model from file

- `get_blend_shape_names()`: Get all blend shape names


- `get_bone_names()`: Get all bone names

- `get_material_names()`: Get all material names



### AvatarOSCIntegrator

High-level integration with MCP ecosystem.

**Methods:**

- `start()`: Start the integrator

- `stop()`: Stop the integrator


- `load_vrm(file_path)`: Load a VRM model

- `set_gesture(hand, gesture, strength=1.0)`: Set a hand gesture


- `set_expression(expression, strength=1.0)`: Set a facial expression

## ðŸ›  Development

### Setup

```bash

# Clone the repository


git clone https://github.com/yourusername/avatarmcp.git
cd avatarmcp

# Install development dependencies
pip install -e ".[dev]"






# Install pre-commit hooks
pre-commit install





```

### Testing

```bash

# Run tests


pytest

# Run with coverage report
pytest --cov=avatarmcp tests/






# Run specific test file
pytest tests/test_osc_server.py -v





```

### Code Style

```bash

# Format code


black .

# Sort imports
isort .






# Check code style
flake8





```

## ðŸ¤ Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

## ðŸ“„ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ðŸ“œ Credits

- VRM Consortium for the [VRM specification](https://vrm.dev/)

- VRChat for the social VR platform


- The MCP community for building MCP tools

---

Made with â¤ï¸ by [Your Name] | [GitHub](https://github.com/yourusername)


## 🌐 Webapp Dashboard

This MCP server includes a free, premium web interface for monitoring and control.
By default, the web dashboard runs on port **10792**.
*(Assigned ports: **10792** (Web dashboard frontend), **10793** (Web dashboard backend (API)))*

To start the webapp:
1. Navigate to the `webapp` (or `web`, `frontend`) directory.
2. Run `start.bat` (Windows) or `./start.ps1` (PowerShell).
3. Open `http://localhost:10792` in your browser.
