# DockerMCP

## FastMCP 2.13+ server for comprehensive Docker operations with Austrian efficiency

[![FastMCP](https://img.shields.io/badge/FastMCP-2.13+-blue)](https://github.com/jlowin/fastmcp)
[![Python](https://img.shields.io/badge/Python-3.8+-green)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-✓-blue)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI/CD](https://github.com/sandraschi/dockermcp/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/sandraschi/dockermcp/actions)
[![Docker Image](https://img.shields.io/docker/pulls/sandraschi/dockermcp)](https://hub.docker.com/r/sandraschi/dockermcp)
[![codecov](https://codecov.io/gh/sandraschi/dockermcp/branch/main/graph/badge.svg?token=YOUR-TOKEN)](https://codecov.io/gh/sandraschi/dockermcp)
[![Austrian Efficiency](https://img.shields.io/badge/Austrian-Efficiency-red)](https://en.wikipedia.org/wiki/Austrian_school)

*Vienna-style Docker management with FastMCP 2.13+ - \
because your containers deserve Sachertorte-level precision.*

## 🚀 Features

### 📊 Monitoring Stack

DockerMCP includes a comprehensive monitoring stack with the following components:

- **Prometheus**: Metrics collection and alerting (Port: 9091)
- **Grafana**: Visualization and dashboards (Port: 3001)
- **Loki**: Log aggregation (Port: 3101)
- **Promtail**: Log collection
- **cAdvisor**: Container metrics (Port: 8082)
- **Node Exporter**: Host metrics (Port: 9100)
- **Redis**: Caching and metrics storage (Port: 6379)

To start the monitoring stack:

```bash
cd monitoring
docker-compose -f docker-compose-monitoring.yml up -d
```

Access the monitoring interfaces:

- **Grafana**: [http://localhost:3001](http://localhost:3001) \
  (admin/admin)
- **Prometheus**: \
  [http://localhost:9091](http://localhost:9091)
- **Loki**: \
  [http://localhost:3101](http://localhost:3101)
- **cAdvisor**: \
  [http://localhost:8082](http://localhost:8082)

### 🧪 Testing

DockerMCP uses a comprehensive testing strategy with the following structure:

```text
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for component interactions
└── e2e/            # End-to-end tests for complete workflows
```

To run the tests:

```bash
# Run all tests
pytest tests/

# Run unit tests only
pytest tests/unit/

# Run with coverage report
pytest --cov=src tests/
```

### 📝 Logging

DockerMCP uses structured JSON logging for better observability:

- All logs are emitted as JSON for easy parsing and analysis
- Includes context information (correlation IDs, request IDs)
- Configurable log levels and output formats
- Automatic log rotation for file output

### State Management (Powered by FastMCP 2.11.3)

DockerMCP leverages FastMCP 2.11.3's built-in state management system \
for all its stateful operations. This provides several key benefits:

- **No External Dependencies**: No Redis or other external services required
- **Consistent State**: All state is managed within the FastMCP runtime
- **TTL Support**: Automatic expiration of temporary state
- **Request Isolation**: Clean separation between different client sessions
- **Efficient Storage**: Optimized for minimal memory footprint

#### Key State Management Features

- Session persistence across requests
- Automatic cleanup of stale data
- Thread-safe operations
- Built-in caching for improved performance

### Core Docker Operations

- **Container Management**: Create, start, stop, restart, and remove containers
- **Image Handling**: Pull, list, tag, and remove Docker images
- **Network Operations**: Manage Docker networks and connections
- **Volume Management**: Handle Docker volumes and storage
- **System Monitoring**: Get Docker system info, version, and disk usage

### Austrian Efficiency Add-ons

- **Docker Watchdog**: Automatic monitoring and recovery \
  of Docker daemon
- **Stack Health Checks**: One-command status \
  of all your stacks
- **Problem Detection**: Find and diagnose issues \
  before they become problems
- **Intelligent Recovery**: Automated fixes for \
  common Docker issues
- **Maintenance Tips**: Proactive suggestions for keeping your \
  Docker environment clean
- **Cross-Platform Support**: Works on both Windows and Linux systems

## 🚨 Docker Watchdog

### Features

- **Automatic Recovery**: Automatically restarts Docker daemon if it becomes unresponsive
- **Cross-Platform**: Works on both Windows and Linux systems
- **Configurable**: Adjust check intervals and retry attempts
- **Detailed Logging**: Comprehensive logs for troubleshooting
- **Service Integration**: Runs as a system service (systemd/Linux, Windows Service/Windows)

## 🚀 Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) installed (RECOMMENDED)
- Python 3.12+

### 📦 Quick Start
Run immediately via `uvx`:
```bash
uvx docker-mcp
```

### 🎯 Claude Desktop Integration
Add to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "docker-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/docker-mcp", "run", "docker-mcp"]
  }
}
```
#### Windows

```powershell
# Run as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install\docker-watchdog.ps1
```

#### Linux

```bash
# Install as systemd service
sudo cp install/docker-watchdog.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now docker-watchdog
```

### Logs

- **Windows**: `docker_watchdog.log` in the installation directory
- **Linux**: `journalctl -u docker-watchdog -f`

## 🔄 CI/CD Pipeline

DockerMCP uses GitHub Actions for CI/CD with the following workflows:

1. **Test**: Runs on every push and pull request
   - Unit tests
   - Integration tests
   - Code coverage reporting

2. **Build and Push**: Runs on push to main and tags
   - Builds Docker image
   - Pushes to Docker Hub
   - Tags with version, branch, and commit SHA

3. **Release**: Creates GitHub releases for tags
   - Generates release notes from CHANGELOG.md
   - Creates GitHub release with artifacts

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub username | Yes | - |
| `DOCKERHUB_TOKEN` | Docker Hub access token | Yes | - |
| `CODECOV_TOKEN` | Codecov upload token | No | - |

## 🏗 Project Structure

```text
dockermcp/
├── src/
│   └── dockermcp/
│       ├── api/                 # API endpoints and routes
│       ├── core/                # Core Docker operations
│       │   ├── containers.py    # Container management
│       │   ├── images.py        # Image handling
│       │   ├── networks.py      # Network management
│       │   ├── system.py        # System operations
│       │   └── volumes.py       # Volume management
│       │
│       ├── models/              # Data models and schemas
│       ├── tools/               # FastMCP 2.11.3 compatible tools
│       │   ├── compose/         # Docker Compose tools
│       │   ├── containers/      # Container management tools
│       │   ├── images/          # Image management tools
│       │   ├── networks/        # Network management tools
│       │   ├── system/          # System management tools
│       │   ├── volumes/         # Volume management tools
│       │   └── workflow/        # Workflow automation tools
│       │
│       └── utils/               # Utility functions
│           ├── json_utils.py    # JSON handling utilities
│           └── process_utils.py # Process management utilities
│
├── tests/                      # Test suite
├── docs/                       # Documentation
└── examples/                   # Usage examples
```

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name dockermcp \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  sandraschi/dockermcp:latest
```

### Using Docker Compose

```bash
git clone https://github.com/sandraschi/dockermcp.git
cd dockermcp
docker-compose up -d
```

## 🚀 Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) installed (RECOMMENDED)
- Python 3.12+

### 📦 Quick Start
Run immediately via `uvx`:
```bash
uvx docker-mcp
```

### 🎯 Claude Desktop Integration
Add to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "docker-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/docker-mcp", "run", "docker-mcp"]
  }
}
```
### Prerequisites

- Python 3.8+
- Docker Engine 20.10.0+
- FastMCP 2.13+ (handles all state management internally)

### From Source

```bash
git clone https://github.com/sandraschi/dockermcp.git
cd dockermcp
uv pip install -e .
```

## 🛠 Usage

### Starting the Server

```bash
# Using Python
python -m dockermcp

# Using Docker
docker run -d \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  sandraschi/dockermcp
```

### API Endpoints

- `GET /health` - Health check endpoint to verify service status
- `GET /docs` - Interactive API documentation \
  (Swagger UI)
- `GET /redoc` - Alternative API documentation with \
  [ReDoc](https://github.com/Redocly/redoc)

### Example: List Containers

```python
from fastmcp import MCPClient

client = MCPClient("http://localhost:8000")
containers = client.list_containers()
print(containers)
```

## 🧩 DXT Package

DockerMCP is available as a DXT package for easy integration with Claude Desktop:

1. Build the DXT package:

   ```bash
   python -m dxt build
   ```

2. Install the resulting `.dxt` file through Claude Desktop

## 📚 Documentation

Full documentation is available at [GitHub Wiki](https://github.com/sandraschi/dockermcp/wiki).

## 🤝 Contributing

Contributions are welcome! Please read our \
[Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - \
see the [LICENSE](LICENSE) file for details.

---

*"In Vienna, even the containers run on time."* - Probably not Gustav Mahler
