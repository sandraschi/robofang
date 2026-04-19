# Installation & Setup

RoboFang is a local-first orchestration layer. This guide focuses on the standard Windows setup using the `start.ps1` workflow.

---

## Prerequisites

1.  **OS**: Windows 11 Pro (recommended).
2.  **Hardware**: NVIDIA GPU (RTX 3060–4090) for local inference.
3.  **Software**:
    - **Ollama**: Installed and running (`ollama serve`).
    - **Python 3.12+**: With `pip` and `venv`.
    - **Node.js 22+**: For the Dashboard frontend.
    - **Tailscale**: (Optional) For secure remote access from mobile/iPhone.

---

## 1. Environment Setup

Clone the repository and initialize the Python virtual environment:

```powershell
git clone https://github.com/sandraschi/robofang.git
cd robofang
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
```

---

## 2. Federation Mapping

The fleet topology is defined in `configs/federation_map.json`. Copy the example and edit for your local MCP servers:

```powershell
cp configs/federation_map.example.json configs/federation_map.json
```

Ensure your `Ollama` models and `MCP` server ports (10700–10860 range) are correctly specified.

---

## 3. Launching RoboFang

The primary entry point is the **`start.ps1`** script. This script clears stale ports, builds the frontend, and initializes the three-process topology (Dashboard, Bridge, Supervisor).

### Automated Start (Recommended)

Run the script from a PowerShell terminal:

```powershell
.\start.ps1
```

The script will:
1.  Verify `Ollama` connectivity.
2.  Clean up any "port squatters" in the 10860-10875 range.
3.  Initialize the **Bridge** (port 10871).
4.  Launch the **Sovereign Dashboard** (port 10864).
5.  Set up the **Supervisor** (port 10872) for process monitoring.

---

## 4. Remote Dashboard (Mobile Access)

To access the Dashboard from an iPhone or remote device:

1.  Ensure **Tailscale** is active on your host and mobile device.
2.  Find your host's Tailscale IP: `tailscale ip -4`.
3.  On your mobile browser, navigate to: `http://<tailscale-ip>:10864`.

---

## Troubleshooting

- **Ollama Timeout**: If the Council hangs, verify your models are pre-loaded: `ollama run llama3.3:70b`.
- **Port Conflicts**: If the `start.ps1` fails to bind, use `Stop-Process` on any orphaned `robofang` or `node` instances.
- **MCP Disconnect**: Ensure your sub-servers are running first; the Bridge auto-discovers only on startup.
