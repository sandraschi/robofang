# robofang-mcp Webapp

Operator UI for the robofang-mcp server: status, test ask, deliberations tail. Ports: 10873 frontend, 10874 backend.

## Ports

| Port | Service   |
|------|-----------|
| 10873 | Frontend (Vite dev or static) |
| 10874 | Backend (FastAPI; proxies to RoboFang bridge; optional — Vite proxies to bridge directly) |

## Run

1. **Backend** (from repo root or `robofang-mcp/webapp/backend`):
   ```powershell
   pip install -r robofang-mcp/webapp/backend/requirements.txt
   uvicorn main:app --app-dir robofang-mcp/webapp/backend --host 0.0.0.0 --port 10874
   ```
   Or set `ROBOFANG_BRIDGE_URL` if the bridge is not at `http://localhost:10871`.

2. **Frontend** (dev):
   ```powershell
   cd robofang-mcp/webapp/frontend
   npm install
   npm run dev
   ```
   Opens at http://localhost:10873 and proxies `/api` to the bridge (10871) directly.

3. **Production**: Build frontend (`npm run build`), then the backend serves `frontend/dist` at `/` when you open http://localhost:10874.

## CORS

Backend allows `http://localhost:10873` and `http://127.0.0.1:10873`. Override with `CORS_ORIGIN`.
