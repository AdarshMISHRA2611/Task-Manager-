# Team Task Manager

![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Production-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker&logoColor=white)
![Railway](https://img.shields.io/badge/Deployed%20on-Railway-000000?logo=railway&logoColor=white)

Production-grade team task manager with role-based access. **FastAPI + SQLAlchemy + JWT** API, **React 18 + TypeScript + Vite + Tailwind + TanStack Query** UI, **multi-stage Docker** image deployed to **Railway** behind a single URL.

> **Live demo:** _replace with your Railway URL_ — `https://<your-app>.up.railway.app`

---

## Highlights

- **Strict role policy** — Admin role is restricted to `@ethara.ai` email addresses. Enforced server-side on signup AND on role promotion. No backdoors, no first-user bypass.
- **⌘K command palette** — global Cmd+K / Ctrl+K opens a fuzzy-searchable palette that jumps to any project, task, or person, plus runs actions (theme toggle, sign out, navigation). Sourced from React Query cache — instant.
- **Dark mode that actually works** — semantic CSS-variable tokens with light `:root` and `.dark` themes, system-preference detection, manual override via Sun/Moon toggle, FOUC-prevention script that applies the theme before React paints.
- **Kanban with drag-and-drop** — `/tasks` toggles between List and Board views. Cards are draggable only when the current user can change the task's status (admin or assignee). Drops fire the same `PUT /api/tasks/{id}` mutation as the inline status select.
- **Task discussions** — every task has a comment thread inside its edit modal. Soft-deleted via `deleted_at` (preserves attribution), Enter-to-send with Shift+Enter for newline, useConfirm flow on delete, indexed `(task_id, created_at)` for fast loads.
- **Custom UI primitives, no native browser controls** — Modal (portal + focus trap + scroll lock), ConfirmDialog (replaces `window.confirm`), Select (keyboard nav, searchable, no native `<select>`), DateTimePicker (no native `datetime-local`), StatusBadge, Skeleton, EmptyState.
- **No `required` HTML attribute anywhere** — every form runs custom inline validation with themed error states that clear as the user types.

---

## Features

### Authentication & RBAC
- Signup / sign-in / JWT bearer tokens / bcrypt-hashed passwords.
- Segmented role pill on Login + Signup ("Sign in as Member" / "Sign in as Admin").
- Admin role gated by `@ethara.ai` email policy (returns 403 if a non-Ethara email tries to claim Admin).
- Login enforces role match — if you signed up as Member, you cannot sign in as Admin.
- Two guards on `PATCH /api/users/{id}/role`: no self-change, never demote the last admin (`At least one admin is required`).

### Projects
- Admins create, edit, delete. Members only see projects they belong to. Creator auto-added as a member.
- Per-project settings card (edit name + description, delete with confirm).
- Per-project team card with searchable add-member dropdown and inline role change.

### Tasks
- Statuses **Todo**, **In Progress**, **Completed**; optional due date and assignee.
- Admins manage all fields; members may **only change the status** of tasks assigned to them (enforced server-side too).
- `/tasks` page has **List ↔ Board** toggle:
  - Kanban board: three columns with HTML5 drag-and-drop. Drag enabled only when the user can change status.
  - Filter bar: search title/description, status, project, assignee (admin only).
- Inline status select in list view; full edit modal for admins.

### Task comments
- Embedded directly inside the task edit modal on both ProjectDetail and Tasks pages.
- Access: admin always, otherwise project members or the task assignee.
- Soft-delete via `deleted_at`. Deleted comments render as italic "Comment deleted" but keep the avatar and author name.
- Compose box: Enter sends, Shift+Enter newline, 2000-char cap, focus-within ring highlight.
- Relative timestamps (`just now`, `5m ago`, `3h ago`, …).

### Dashboard
- Five stat cards: Total / Todo / In Progress / Completed / Overdue. Scoped by role (admin sees all, member sees own).
- Hover lift + tinted icon glow per category.

### Team directory
- Admin only. Search by name/email + role filter.
- Inline role select per row with disabled options for self + last-admin guard.
- Counter: "X admins • Y total".

### Profile
- Avatar initials badge + name / email / role pill.
- Edit name + email (single PATCH, diffs only).
- Change password section: current + new + confirm with independent show/hide.

### Command palette (⌘K / Ctrl+K)
- Global hotkey from any authenticated page.
- Sections: Actions, Projects, Tasks, People (admin only).
- Keyboard nav: ↑↓ arrows (wraparound), Enter to select, Esc to close.
- Discoverable Search chip in the navbar with `⌘K` kbd hint (sm: and up).

### Theme system
- Light + dark themes via semantic CSS-variable tokens (background, surface, brand, accent, destructive, success, warning, etc., each with `subtle` / `subtle-foreground` / `subtle-border` variants).
- Brand: blue (#2563eb light / #3b82f6 dark). Accent: teal.
- Sun/Moon toggle in the navbar; system preference auto-detected; persisted to localStorage.
- FOUC-prevention script in `index.html` applies the theme class to `<html>` before React mounts.

---

## API surface

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | public | Optional `role`. Admin role requires `@ethara.ai` email |
| POST | `/api/auth/login` | public | Optional `role` for verification; returns `{ access_token, token_type }` |
| GET | `/api/auth/me` | bearer | Current user |
| PATCH | `/api/auth/me` | bearer | Update name / email / password (current_password required to change password) |
| GET | `/api/projects` | bearer | Admin: all. Member: joined only |
| POST | `/api/projects` | admin | Creator auto-added as member |
| GET / PUT / DELETE | `/api/projects/{id}` | bearer / admin / admin | |
| GET / POST | `/api/projects/{id}/members` | bearer / admin | |
| DELETE | `/api/projects/{id}/members/{user_id}` | admin | |
| GET | `/api/tasks` | bearer | Admin: all. Member: assigned only |
| POST | `/api/tasks` | admin | Assignee must be a project member |
| GET / PUT / DELETE | `/api/tasks/{id}` | bearer / mixed / admin | Member PUT = status only |
| GET | `/api/tasks/{id}/comments` | bearer | Admin, project member, or assignee |
| POST | `/api/comments` | bearer | Same access rule as listing |
| DELETE | `/api/comments/{id}` | bearer | Own comments only, or admin. Soft-delete |
| GET | `/api/dashboard` | bearer | Stats scoped by role |
| GET | `/api/users` | admin | Sorted by name |
| PATCH | `/api/users/{id}/role` | admin | No self-change, no last-admin demote, `@ethara.ai` gate on Admin promotion |
| GET | `/health` `/ready` | public | Liveness + DB readiness |

Interactive docs are served at `/docs` (Swagger) and `/redoc`.

---

## Layout

```text
backend/
  main.py            # FastAPI app, CORS, routers, SPA fallback
  config.py          # Pydantic settings, normalize Postgres URL
  database/database.py
  models/models.py   # User, Project, ProjectMember, Task, TaskComment
  schemas/schemas.py # Pydantic schemas
  routers/           # auth, projects, tasks, comments, dashboard, users
  utils/             # security (JWT, bcrypt), deps (DI)

frontend/src/
  App.tsx            # routes + providers (Theme, Confirm, Auth, ErrorBoundary)
  components/        # AppLayout, Navbar, Sidebar, CommandPalette,
                     # TaskComments, ProtectedRoute, ErrorBoundary
  components/ui/     # Button, Card, Modal, ConfirmDialog, Select,
                     # DateTimePicker, StatusBadge, Skeleton, EmptyState, hooks
  pages/             # Login, Signup, Dashboard, Projects, ProjectDetail,
                     # Tasks, Team, Profile
  services/          # api, authContext, themeContext, queryClient, types

Dockerfile           # multi-stage: build frontend → copy into FastAPI image
railway.json         # Railway DOCKERFILE builder + /health healthcheck
.env.example
```

---

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

### Useful checks

```powershell
# Type-check the frontend
cd frontend; .\node_modules\.bin\tsc --noEmit

# Verify backend imports cleanly
$env:PYTHONPATH = (Get-Location).Path
.\.venv\Scripts\python.exe -c "import backend.main; print('OK')"
```

---

## Environment variables

```env
DATABASE_URL=sqlite:///./team_task_manager.db
SECRET_KEY=change-me-in-production-use-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
CORS_ORIGINS=
```

For production (Railway), set `DATABASE_URL` to a Postgres URL (`postgresql+psycopg://…`), `ENVIRONMENT=production`, and a strong `SECRET_KEY` (≥ 32 characters). With `CORS_ORIGINS` empty, the API allows `*.railway.app` origins automatically — perfect for the single-service Docker setup where the UI and API share the same host. The app will refuse to start in production if `SECRET_KEY` is shorter than 32 chars or still contains `change-me` / `replace`.

---

## Production build (Docker)

The multi-stage `Dockerfile` builds the React bundle with Node 20 and copies it into a Python 3.12 image that runs `uvicorn backend.main:app`. FastAPI serves the SPA from `./static` for every non-API path, so the whole app ships as one service.

```bash
docker build -t team-task-manager .
docker run -p 8000:8000 --env-file .env team-task-manager
```

---

## Deploy to Railway

1. Push to GitHub.
2. On <https://railway.app>, create a new project → "Deploy from GitHub repo".
3. Add the **PostgreSQL** plugin and reference its connection string with `${{Postgres.DATABASE_URL}}`.
4. Set environment variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `SECRET_KEY` (≥ 32 chars), `ENVIRONMENT=production`, `ACCESS_TOKEN_EXPIRE_MINUTES=1440`. Leave `CORS_ORIGINS` empty.
5. Railway uses the `Dockerfile` automatically (via `railway.json`); health check path is already set to `/health`.
6. Generate a domain in Networking. First sign-up at `https://<domain>/signup` becomes the working tenant; the first user with an `@ethara.ai` email signing up as Admin gets Admin role.

The live URL never changes for subsequent pushes — every push to `main` triggers a redeploy.

---

## Engineering rules baked into this codebase

- **No `required` HTML attribute anywhere.** Forms run custom JS validation with themed inline errors (`border-destructive` + `! message text-destructive`) that clear as the user types.
- **No `window.confirm` / `window.alert`.** Replaced by `useConfirm()` returning `Promise<boolean>` with `tone: 'danger' | 'primary'`.
- **No native `<select>` or `<input type="datetime-local">`.** Both are replaced with portal-rendered custom components that auto-flip and never get clipped by parent `overflow: hidden`.
- **No type-error suppression.** No `as any`, no `@ts-ignore`. `tsc --noEmit` is clean on every commit.
- **No `bg-slate-9XX` literals except `bg-slate-900/40`** — and only for the modal / sidebar / palette backdrop, which works in both themes.
- **Soft-delete on comments** (`deleted_at`) preserves attribution and audit trail.
