# Ethara Workboard

Full-stack app for **initiatives (projects)**, **rosters**, **work items (tasks)**, and **role-based access** — **Admin** vs **Member**. Stack: **FastAPI**, **SQLAlchemy**, **JWT**, **bcrypt** on the API side; **React**, **TypeScript**, **Vite**, **Tailwind** on the UI.

## Features

- **Authentication**: Sign up, sign in, JWT bearer tokens, hashed passwords, protected routes on both UI and API.
- **Initiatives**: Admins create, update, or remove initiatives (`projects` in the API). Members only see initiatives where they appear in `project_members`. The creator is added as a member automatically.
- **Roster**: Many-to-many **users ↔ initiatives** via `project_members`; admins invite from the user directory.
- **Work items**: Stages **Queued**, **Active**, **Done**; optional due date; optional owner (`assigned_to`). Admins manage all fields; members may **change stage only** on items assigned to them.
- **Overview**: Totals by stage plus **overdue** (past due and not **Done**), filtered by role the same way as the task list.
- **UI**: Teal-forward theme, Plus Jakarta Sans, responsive shell, skeleton states, toasts, and error boundary.

## Layout

```text
backend/
  main.py
  config.py
  requirements.txt
  routers/        # auth, projects, tasks, dashboard, users
  models/
  schemas/
  database/
  utils/

frontend/src/
  components/
  pages/
  services/
```

## Environment

Copy `.env.example` to `.env` and adjust.

| Variable | Description |
|----------|-------------|
| `ENVIRONMENT` | `development` (default) or `production`. In production, `SECRET_KEY` must be strong (see below) and CORS is tightened. |
| `CORS_ORIGINS` | Comma-separated browser origins. Use `*` only for debugging. Empty in production when the SPA is served from the **same origin** as the API. |
| `DATABASE_URL` | SQLAlchemy URL. Default: SQLite file `ethara_local.db`. On Railway use PostgreSQL, e.g. `postgresql+psycopg://USER:PASSWORD@HOST:PORT/DB`. |
| `SECRET_KEY` | JWT signing secret. In production: **≥ 32 characters**, not a placeholder. |
| `ALGORITHM` | JWT algorithm (default `HS256`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime (default 1440 = 24h). |
| `PORT` | HTTP port (Railway sets this). |
| `VITE_API_URL` | Frontend API base URL. Empty = same-origin `/api`. |

## Local run

**Python 3.12+**, **Node 20+**.

### API

From the repo root (so `backend` is importable):

```powershell
cd "d:\Task Manager\Ethara-task-manager"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn backend.main:app --reload --port 8000
```

- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

- UI: `http://127.0.0.1:5173` (Vite proxies `/api`, `/health`, `/ready` to port 8000).

## REST API (summary)

Base path: `/api` (auth under `/api/auth`).

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Body: `name`, `email`, `password`, `role` (`Admin` \| `Member`). |
| POST | `/api/auth/login` | No | Returns `{ access_token, token_type }`. |
| GET | `/api/auth/me` | Bearer | Current user. |

### Initiatives (`/api/projects` …)

CRUD and `GET/POST/DELETE .../members` as in OpenAPI — same resource names as typical “projects” APIs; the product UI calls them **initiatives**.

### Work items (`/api/tasks` …)

List/create/get/update/delete — member updates are **stage-only** (same `PUT` with only `status` in the body).

### Overview

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Bearer | `{ total_tasks, queued_tasks, active_tasks, done_tasks, overdue_tasks }`. Admin: all items. Member: assigned items only. |

### Health

- `GET /health` — liveness.
- `GET /ready` — DB connectivity (`503` if down).

## Validation

Pydantic validates payloads; duplicate emails rejected on signup; assignees must be initiative members; consistent JSON errors with `detail`.

## Railway

1. Add **PostgreSQL** and copy `DATABASE_URL` (use `postgresql+psycopg://...`).
2. Deploy from this repo with the root **`Dockerfile`** (see `railway.json`).
3. Set `DATABASE_URL`, `SECRET_KEY` (long random, ≥ 32 chars), `ENVIRONMENT=production`, and `CORS_ORIGINS` if the UI is on another origin.
4. Health check: **`GET /health`**; optional readiness: **`GET /ready`**.
5. The container runs **uvicorn** and serves the **built SPA** from `/app/static` for non-API routes.

## Demo checklist

1. Sign up as **Admin**, then sign in.
2. Under **Initiatives**, create one (you are on the roster automatically).
3. Sign up a **Member** (e.g. incognito); note their **user id** from the toast.
4. As Admin, open the initiative → **Roster** → add the member from the directory.
5. Create **work items** with an owner and optional due date.
6. As Member, open **Work items** or the initiative and change **stage** only; as Admin, use **Edit** for full fields.
7. Compare **Overview** on each account (global vs assigned-only).

## Submission

- **Live URL**: your Railway deployment.
- **GitHub**: this repository.
- **README**: this file.

## License

Sample / portfolio code unless you add your own license.
