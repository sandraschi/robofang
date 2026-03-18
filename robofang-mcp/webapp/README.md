# robofang-mcp Webapp

Operator UI for the robofang-mcp server: status, test ask, deliberations tail. Synced with fleet MCP webapp ports (10760 frontend, 10761 backend).

## Ports

| Port | Service   |
|------|-----------|
| 10760 | Frontend (Vite dev or static) |
| 10761 | Backend (FastAPI; proxies to RoboFang bridge) |

## Run

1. **Backend** (from repo root or `robofang-mcp/webapp/backend`):
   ```powershell
   pip install -r robofang-mcp/webapp/backend/requirements.txt
   uvicorn main:app --app-dir robofang-mcp/webapp/backend --host 0.0.0.0 --port 10761
   ```
   Or set `ROBOFANG_BRIDGE_URL` if the bridge is not at `http://localhost:10871`.

2. **Frontend** (dev):
   ```powershell
   cd robofang-mcp/webapp/frontend
   npm install
   npm run dev
   ```
   Opens at http://localhost:10760 and proxies `/api` to the backend (10761).

3. **Production**: Build frontend (`npm run build`), then the backend serves `frontend/dist` at `/` when you open http://localhost:10761.

## CORS

Backend allows `http://localhost:10760` and `http://127.0.0.1:10760`. Override with `CORS_ORIGIN`.
