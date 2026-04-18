# Installation & Deployment (v1.8.0)

Follow these steps to deploy the **OpenClaw++** industrial stack on your sovereign machine.

---

## 🛠️ 1. Prerequisites

- **OS**: Windows 11 Pro (Recommended) or Linux.
- **Python**: 3.12+ (Managed via [**uv**](https://github.com/astral-sh/uv)).
- **LLM**: [**Ollama**](https://ollama.com/) with `llama3.2`, `deepseek-r1`, and `qwen2.5`.
- **Network**: [**Tailscale**](https://tailscale.com) for secure cross-device fleet management.

---

## 📥 2. Repository Setup

RoboFang uses `uv` for ultra-fast, reproducible dependency management.

```powershell
# Clone the substrate
git clone https://github.com/sandraschi/robofang
cd robofang

# Sync environment and install as editable
uv sync
```

---

## 🔒 3. Secure Network Binding

v1.8.0 defaults to a closed security posture. To enable secure remote access (e.g., from the mobile supervisor app or a biped robot):

1.  **Install Tailscale** and log in on your host machine.
2.  **Verify IP**: Run `tailscale ip -4`. RoboFang will automatically detect this address (e.g., `100.118.171.110`) and priority-bind all services to it.
3.  **Local Only**: If Tailscale is not detected, RoboFang defaults to `127.0.0.1`.

---

## 🚀 4. Launching the Hub

The system is managed by a multi-process supervisor that maintains bridge liveness.

```powershell
# Start the full stack (Supervisor + Bridge + MCP Gateway)
uv run python -m robofang.main
```

### Dashboard Access
The Vite-based dashboard runs on port **10864** (or **10870**).
```powershell
cd dashboard
npm install
npm run dev -- --port 10864
```

---

## ✅ 5. Post-Install Verification

Run the unified verification suite to ensure all v1.8.0 layers are active:

```powershell
uv run python scratch/verify_v180.py
```

Expected Output:
- [OK] Secure Bind: `100.118.171.110` (Tailscale)
- [OK] Bastio Gateway: Initialized (HMAC active)
- [OK] DTU Proxy: Staging enabled
- [OK] Metrics: `/metrics` reachable
