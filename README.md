# Team Task Manager

Full-stack team task manager with role-based access — **Admin** vs **Member**. Stack: **FastAPI**, **SQLAlchemy**, **JWT**, **bcrypt** on the API side; **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **TanStack Query** on the UI.

## Features

- **Authentication** — sign up, sign in, JWT bearer tokens, bcrypt-hashed passwords, protected routes on UI + API. The **first user to sign up becomes Admin**; everyone after joins as Member.
- **Projects** — admins create, edit, and delete projects. Members only see projects they belong to. The creator is auto-added as a member.
- **Members** — many-to-many users ↔ projects via `project_members`. Admins add or remove members and can promote/demote any member (except the last admin, except themselves).
- **Tasks** — statuses **Todo**, **In Progress**, **Completed**; optional due date and assignee. Admins manage all fields; members may **only change the status** of tasks assigned to them.
- **Dashboard** — totals by status plus **overdue** (past due and not Completed), scoped by role.
- **Team directory** — admin-only page with search and role filter.
- **Profile** — change name, email, and password (password change requires current password).
- **UI** — light emerald-on-slate theme, Inter font, custom Modal, ConfirmDialog, Select, and DateTimePicker (no native browser controls anywhere), skeleton states, toasts, error boundary.

## Layout

```text
backend/
  main.py            # FastAPI app, CORS, routers, SPA fallback
  config.py          # Pydantic settings
  requirements.txt
  database/database.py
  models/models.py   # User, Project, ProjectMember, Task
  schemas/schemas.py # Pydantic schemas
  routers/           # auth, projects, tasks, dashboard, users
  utils/             # security (JWT, bcrypt), deps (DI)

frontend/src/
  App.tsx            # routes + providers
  components/        # AppLayout, Navbar, Sidebar, ProtectedRoute, ErrorBoundary
  components/ui/     # Button, Card, Modal, ConfirmDialog, Select,
                     # DateTimePicker, StatusBadge, Skeleton, EmptyState, hooks
  pages/             # Login, Signup, Dashboard, Projects, ProjectDetail,
                     # Tasks, Team, Profile
  services/          # api, authContext, queryClient, types

Dockerfile           # multi-stage: build frontend → copy into FastAPI image
railway.json
.env.example
```

## API surface

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | public | First user → Admin, rest → Member |
| POST | `/api/auth/login` | public | Returns `{ access_token, token_type }` |
| GET | `/api/auth/me` | bearer | Current user |
| PATCH | `/api/auth/me` | bearer | Update name / email / password |
| GET | `/api/projects` | bearer | Admin: all. Member: joined only |
| POST | `/api/projects` | admin | Creator auto-added as member |
| GET / PUT / DELETE | `/api/projects/{id}` | bearer / admin / admin | |
| GET / POST | `/api/projects/{id}/members` | bearer / admin | |
| DELETE | `/api/projects/{id}/members/{user_id}` | admin | |
| GET | `/api/tasks` | bearer | Admin: all. Member: assigned only |
| POST | `/api/tasks` | admin | Assignee must be a project member |
| GET / PUT / DELETE | `/api/tasks/{id}` | bearer / mixed / admin | Member PUT = status only |
| GET | `/api/dashboard` | bearer | Stats scoped by role |
| GET | `/api/users` | admin | Sorted by name |
| PATCH | `/api/users/{id}/role` | admin | No self-change, no last-admin demote |
| GET | `/health` `/ready` | public | Liveness + DB readiness |

## Local development (Windows PowerShell)

```powershell
# Create a venv and install Python deps
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:PYTHONPATH = (Get-Location).Path

# Install frontend deps
npm install --prefix frontend

# Run both servers together
npx --yes concurrently -n api,ui -c blue,green `
  ".\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --reload-dir backend --port 8000" `
  "npm run dev --prefix frontend"
```

- Backend: <http://localhost:8000>
- Frontend: <http://localhost:5173>
- API docs: <http://localhost:8000/docs>

> Use the full `.\.venv\Scripts\python.exe` path so uvicorn's reload subprocess can't pick up the wrong Python interpreter on Windows.

## Environment variables

```env
DATABASE_URL=sqlite:///./team_task_manager.db
SECRET_KEY=change-me-in-production-use-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
CORS_ORIGINS=
```

For production (Railway), set `DATABASE_URL` to a Postgres URL (`postgresql+psycopg://…`), `ENVIRONMENT=production`, and a strong `SECRET_KEY` (≥ 32 characters). With `CORS_ORIGINS` empty, the API allows `*.railway.app` origins automatically — perfect for the single-service Docker setup where the UI and API share the same host.

## Production build (Docker)

The included multi-stage `Dockerfile` builds the React bundle with Node 20 and copies it into a Python 3.12 image that runs `uvicorn backend.main:app`. FastAPI serves the SPA from `./static` for every non-API path, so the whole app ships as one service.

```bash
docker build -t team-task-manager .
docker run -p 8000:8000 --env-file .env team-task-manager
```

## Deploy to Railway

1. Push to GitHub.
2. On <https://railway.app>, create a new project → "Deploy from GitHub repo".
3. Add the **PostgreSQL** plugin, copy its connection string.
4. Set environment variables: `DATABASE_URL`, `SECRET_KEY` (≥ 32 chars), `ENVIRONMENT=production`.
5. Railway uses the `Dockerfile` automatically (via `railway.json`).
6. Set the health check path to `/health`. Deploy.
