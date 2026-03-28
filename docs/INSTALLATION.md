# Installation & Setup

Follow these steps to deploy the full RoboFang stack on your local Windows machine.

---

## 1. System Requirements

- **OS**: Windows 11 Pro
- **Hardware**: NVIDIA RTX 3090/4090 recommended (24GB VRAM for Council operations)
- **Software**: 
  - [Ollama](https://ollama.com/)
  - [UV](https://github.com/astral-sh/uv) (Python package manager)
  - [Node.js 22+](https://nodejs.org/)

---

## 2. Model Preparation

RoboFang's Council requires local models to be available in Ollama. Pull the recommended set:

```powershell
ollama pull llama3.2:3b
ollama pull deepseek-r1:8b
ollama pull qwen2.5:7b
```

---

## 3. Repository Setup

```powershell
git clone https://github.com/sandraschi/robofang
cd robofang
uv sync
```

---

## 4. Environment Configuration

Create a `.env` file in the root directory (optional, defaults are usually sufficient):

```ini
ROBOFANG_REPOS_ROOT=D:/Dev/repos
ROBOFANG_AUTO_LAUNCH_CONNECTORS=false
ROBOFANG_FLEET_MANIFEST=configs/federation_map.json
OLLAMA_URL=http://localhost:11434
```

---

## 5. Launching the Stack

### Step A: The Bridge (Backend)
The Bridge manages connectors and reasoning.

```powershell
uv run python -m robofang.cli start bridge
```

### Step B: The Dashboard (Frontend)
The clean web UI for monitoring the council and fleet.

```powershell
cd dashboard
npm install
npm run dev -- --port 10864
```

---

## 6. Verification

1. Open http://localhost:10864.
2. Check the **Fleet** tab to see discovered connectors.
3. Check the **Status** indicator to verify Ollama connectivity.
4. Try a test query: "List all active fleet members".
