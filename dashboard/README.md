# robofang Sovereign Dashboard

React/TypeScript/Vite frontend for the [robofang](../README.md) orchestration hub. Provides real-time fleet monitoring, Council of Dozens control, and home/infra management in a single SOTA dark-mode interface.

**Default dev port:** `5173`  
**Production port:** `10864` (served via `start.bat` / `start.ps1`)

---

## Stack

- **React 19** + **TypeScript 5.9**
- **Vite 7** (build + HMR)
- **Tailwind CSS v4**
- **React Router DOM v7**
- **Framer Motion v12** (animations)
- **Lucide React** (icons)
- **Axios** (API calls to the FastAPI backend)

---

## Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Dashboard | Fleet overview, status summary |
| `/fleet` | Fleet | Per-agent status and controls |
| `/pulse` | Pulse | Live metrics and health feed |
| `/council` | Council | Council of Dozens session control |
| `/deliberations` | Deliberations | Session history and consensus viewer |
| `/llm` | LLM | Local LLM interface |
| `/home` | HomeHub | Smart home controls (Tapo, Hue, etc.) |
| `/infra` | InfraHub | Infrastructure management |
| `/knowledge` | KnowledgeHub | Advanced Memory / knowledge base |
| `/creative` | CreativeHub | Creative tools integration |
| `/connectors` | Connectors | Connector configuration |
| `/timeline` | Timeline | Activity timeline |
| `/logger` | Logger | Log viewer |
| `/settings` | Settings | Dashboard configuration |
| `/help` | Help | Documentation |
| `/kitchen-sink` | KitchenSink | Component showcase |

---

## Development

```powershell
cd dashboard
npm install
npm run dev
```

Vite dev server starts at `http://localhost:5173`.  
Expects the robofang FastAPI backend running at `http://localhost:10864/api`.

## Production Build

```powershell
npm run build
```

Output goes to `dist/`. Served statically by the FastAPI app or via `start.bat`.

## Start Scripts

```powershell
# PowerShell
.\start.ps1

# or batch
.\start.bat
```

Both scripts build and/or launch the app on port `10864`.

---

## API Wiring

All API calls go through `src/api/index.ts`. The base URL defaults to `/api` (proxied by Vite in dev to `localhost:10864`).

---

## Linting

```powershell
npm run lint
```

ESLint 9 with `@typescript-eslint` and `eslint-plugin-react-hooks`.

---

## Notes

- `.backup` files in `src/` are in-place rollback snapshots — not build artifacts.
- The `dist/` folder is committed for quick static deployment without a build step.
- Tailwind v4 uses the new `@tailwindcss/postcss` plugin — no `tailwind.config.js` class-based config needed for utilities.
