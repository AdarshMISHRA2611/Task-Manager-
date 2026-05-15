# Full-Stack Team Task Manager — Complete Cursor Prompt

> **How to use this file:** Open a new Cursor project, paste the contents of this file into the chat, and say:
> *"Build this project exactly as described in this prompt."*
> Cursor will scaffold the entire application from scratch.

---

## Project Overview

Build a full-stack **Team Task Manager** web application with the following stack:

- **Backend:** Python, FastAPI, SQLAlchemy ORM, SQLite (local) / PostgreSQL (production), JWT authentication, bcrypt password hashing, Pydantic validation
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router DOM, Axios, TanStack React Query, React Hot Toast, Lucide React icons
- **Deployment:** Docker (multi-stage build), Railway-ready with `railway.json` and `.env.example`

The app has two roles: **Admin** and **Member**. The very first user to sign up automatically becomes Admin. All subsequent signups are Members. Admins manage everything; Members only see and update work assigned to them.

---

## Tech Stack — Exact Versions

### Backend (`backend/requirements.txt`)
```
fastapi>=0.115.6
uvicorn[standard]>=0.32.1
sqlalchemy>=2.0.36
psycopg[binary]>=3.2.13
pydantic[email]>=2.12.0
pydantic-settings>=2.7.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
bcrypt>=4.0.1
```

### Frontend (`frontend/package.json` dependencies)
```
react, react-dom (^18)
react-router-dom (^6)
axios
@tanstack/react-query
react-hot-toast
lucide-react
clsx
```

### Frontend devDependencies
```
typescript, vite, @vitejs/plugin-react
tailwindcss, postcss, autoprefixer
@types/react, @types/react-dom
```

---

## Project Structure

```
project-root/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, routers, SPA fallback
│   ├── config.py                # Pydantic settings (DATABASE_URL, SECRET_KEY, etc.)
│   ├── requirements.txt
│   ├── database/
│   │   └── database.py          # SQLAlchemy engine, session, Base
│   ├── models/
│   │   └── models.py            # User, Project, ProjectMember, Task ORM models
│   ├── schemas/
│   │   └── schemas.py           # Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py              # signup, login, GET /me, PATCH /me
│   │   ├── projects.py          # CRUD + members
│   │   ├── tasks.py             # CRUD with RBAC
│   │   ├── dashboard.py         # aggregated stats
│   │   └── users.py             # user list + role update (admin only)
│   └── utils/
│       ├── security.py          # JWT creation/verification, bcrypt hashing
│       └── deps.py              # FastAPI dependency injection (CurrentUser, AdminUser)
├── frontend/
│   ├── index.html               # loads Inter font from Google Fonts
│   ├── vite.config.ts           # proxies /api → localhost:8000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── index.css            # Tailwind imports + custom @layer utilities
│       ├── App.tsx              # Router, AuthProvider, ConfirmProvider
│       ├── components/
│       │   ├── AppLayout.tsx
│       │   ├── Navbar.tsx
│       │   ├── Sidebar.tsx
│       │   ├── ProtectedRoute.tsx
│       │   ├── ErrorBoundary.tsx
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       ├── Modal.tsx
│       │       ├── ConfirmDialog.tsx
│       │       ├── Select.tsx
│       │       ├── DateTimePicker.tsx
│       │       ├── StatusBadge.tsx
│       │       ├── Skeleton.tsx
│       │       ├── EmptyState.tsx
│       │       └── hooks.ts
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Signup.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Projects.tsx
│       │   ├── ProjectDetail.tsx
│       │   ├── Tasks.tsx
│       │   ├── Team.tsx
│       │   └── Profile.tsx
│       └── services/
│           ├── api.ts           # Axios instance + error helper
│           ├── authContext.tsx  # Auth state, login/signup/logout/refreshMe
│           ├── queryClient.ts   # TanStack Query client + query keys
│           └── types.ts         # TypeScript interfaces
├── Dockerfile
├── railway.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Database Models

### `users`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | auto-increment |
| name | String(255) | required |
| email | String(255) | unique, lowercase |
| password | String(255) | bcrypt hash |
| role | String(32) | `"Admin"` or `"Member"` |
| created_at | DateTime | server default = now |

### `projects`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(255) | required |
| description | Text | nullable |
| created_by | Integer FK → users.id | |
| created_at | DateTime | |

### `project_members` (join table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| project_id | Integer FK → projects.id | CASCADE delete |
| user_id | Integer FK → users.id | CASCADE delete |

### `tasks`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| title | String(255) | required |
| description | Text | nullable |
| status | String(32) | `"Todo"` / `"In Progress"` / `"Completed"` |
| assigned_to | Integer FK → users.id | nullable |
| project_id | Integer FK → projects.id | CASCADE delete |
| due_date | DateTime | nullable |
| created_at | DateTime | |

---

## API Endpoints

### Auth (`/api/auth/...`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Name, email, password. First user → Admin, rest → Member |
| POST | `/api/auth/login` | No | Returns `{ access_token, token_type }` |
| GET | `/api/auth/me` | Bearer | Current user profile |
| PATCH | `/api/auth/me` | Bearer | Update name, email, or password (requires `current_password` to change password) |

### Projects (`/api/projects/...`)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/projects` | Bearer | Admin: all. Member: joined only |
| POST | `/api/projects` | Admin | Create. Creator auto-added as member |
| GET | `/api/projects/{id}` | Bearer | Single project |
| PUT | `/api/projects/{id}` | Admin | Update name/description |
| DELETE | `/api/projects/{id}` | Admin | Delete (cascades tasks + memberships) |
| GET | `/api/projects/{id}/members` | Bearer | Returns `[{ membership_id, user_id, name, email, role }]` |
| POST | `/api/projects/{id}/members` | Admin | Body: `{ user_id }` |
| DELETE | `/api/projects/{id}/members/{user_id}` | Admin | Remove member |

### Tasks (`/api/tasks/...`)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/tasks` | Bearer | Admin: all. Member: assigned only |
| POST | `/api/tasks` | Admin | Assignee must be a project member |
| GET | `/api/tasks/{id}` | Bearer | Admin: any. Member: own only |
| PUT | `/api/tasks/{id}` | Bearer | Admin: full update. Member: status only |
| DELETE | `/api/tasks/{id}` | Admin | |

### Users (`/api/users/...`)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | All users, sorted by name |
| PATCH | `/api/users/{id}/role` | Admin | Promote/demote. Guards: no self-change, no last-admin demote |

### Other
| Method | Path | Description |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/ready` | DB connectivity check, 503 if unreachable |

---

## Role-Based Access Control

| Action | Admin | Member |
|---|---|---|
| Create / edit / delete projects | ✅ | ❌ |
| Add / remove project members | ✅ | ❌ |
| Create / edit / delete tasks | ✅ | ❌ |
| Update task status | ✅ | ✅ (own assigned tasks only) |
| View all projects | ✅ | ❌ (member projects only) |
| View all tasks | ✅ | ❌ (assigned only) |
| Manage user roles | ✅ | ❌ |
| View team directory | ✅ | ❌ |

---

## Frontend Pages & Features

### Login (`/login`)
- Email + password fields with leading icons (Mail, Lock)
- Custom password show/hide toggle button (Eye/EyeOff icon)
- Brand logo badge at top
- Navigates to dashboard on success

### Signup (`/signup`)
- Name, email, password fields — NO role selector (role assigned server-side)
- Live password strength meter (5 segments, colour-coded: weak → excellent)
- Password show/hide toggle
- Disclosure note: "You'll join as a Member"

### Dashboard (`/dashboard`)
- 5 stat cards: Total Tasks, Todo, In Progress, Completed, Overdue
- Each card has hover effect: lifts up (`-translate-y-0.5`), border brightens, icon scales, coloured drop shadow
- Scoped by role (admin sees all, member sees assigned only)
- Skeleton loading state

### Projects (`/projects`)
- Table listing all accessible projects
- Admin: "New project" form with custom inline validation (no browser tooltips)
- Links to individual project detail pages

### Project Detail (`/projects/:id`)
- Breadcrumb navigation
- Admin: project settings card (edit name/description, delete with confirm dialog)
- Admin: team card — searchable member directory dropdown, add/remove members, inline role change per member
- Admin: create task form with custom Select (assignee from members), DateTimePicker (due date), Select (status)
- Task table — Admin sees Edit button (opens Modal), Member sees status-only Select on their tasks

### Tasks (`/tasks`)
- Full task list across all projects
- Admin: create task form with project Select, assignee input, DateTimePicker, status Select
- Delete with confirm dialog
- Member: inline status Select on assigned tasks

### Team (`/team`) — Admin only
- Search by name/email, filter by role
- Each user row has role Select (custom dropdown)
- Confirm dialog before promote/demote
- Guards: can't change own role, can't demote last admin
- Counter: "X admins • Y total"

### Profile (`/profile`)
- Avatar initials badge, name, email, role display
- Edit name + email form (saves via PATCH /api/auth/me, refreshes navbar)
- Separate change-password section (requires current password, confirm new password, show/hide toggles)
- Member-since footer

### Navbar
- App logo (left)
- Profile dropdown (right): avatar initials button → dropdown with name, email, role badge, "My profile" link, "Manage team" link (admin only), "Sign out" button
- Sign out triggers a custom ConfirmDialog before logging out

### Sidebar
- Dashboard, Projects, Tasks links (all roles)
- Team link (Admin only)
- Mobile: slide-in drawer with backdrop

---

## Custom UI Components (no browser defaults anywhere)

### `Button`
Variants: `primary` (brand indigo), `secondary` (slate), `ghost`, `danger` (rose). Sizes: `sm`, `md`, `lg`.

### `Card`
Dark slate card with optional `padding={false}`. Used everywhere for sections.

### `Modal`
Portal-rendered (`createPortal` → `document.body`). Features: backdrop blur, focus trap, body scroll lock, Escape-to-close, header/footer slots, sizes `sm`/`md`/`lg`, fade-in animation.

### `ConfirmDialog` + `useConfirm`
Provider-based. Call `await confirm({ title, description, confirmLabel, tone })` from any component instead of `window.confirm`. `tone`: `"danger"` (red) or `"primary"` (brand). Wraps the entire app in `App.tsx`.

### `Select`
Fully custom themed dropdown replacing all `<select>` elements. Features:
- Keyboard navigation (↑↓ arrows, Enter, Home, End, Escape)
- Optional search box (enabled via `searchable` prop)
- Option descriptions (secondary line under label)
- Checkmark on selected option
- Animated open/close
- Never uses native browser select

### `DateTimePicker`
Fully custom replacing all `<input type="datetime-local">`. Features:
- Renders via `createPortal` → never clipped by parent `overflow: hidden`
- Auto-positions: drops down normally, **flips upward** if insufficient space below
- Updates position on scroll and resize
- Past date blocking (`disablePast=true` by default) — past days greyed out and unclickable
- Month navigation with `←` / `→` arrows
- Cell states: normal / today (ring highlight) / selected (brand fill) / outside month (muted) / past (disabled)
- Custom time **Stepper** controls (no browser number spinners):
  - `▲` button → increments (wraps at max)
  - Editable text field (direct typing)
  - `▼` button → decrements (wraps at min)
  - Hour: 0–23 (24h), Minute: 0–59 step 5
- "Now" button sets current date/time
- "Done" button closes picker
- Clear `×` button on trigger when a value is set

### `StatusBadge`
Coloured pill for task statuses: Todo (slate), In Progress (amber), Completed (emerald).

### `Skeleton`
Shimmer loading placeholder. Used in all data-loading states.

### `EmptyState`
Icon + title + description for empty lists.

### `hooks.ts`
- `useClickOutside` — close dropdowns/popovers on outside click
- `useKey` — trigger callback on keypress (Escape etc.)
- `useBodyScrollLock` — prevents background scroll when modal is open

---

## Design System

### Colours
```js
brand: {
  50: "#eef2ff",  100: "#e0e7ff",  200: "#c7d2fe",
  300: "#a5b4fc",  400: "#818cf8",  500: "#6366f1",
  600: "#4f46e5",  700: "#4338ca",  800: "#3730a3",  900: "#312e81"
}
// Base: slate-950 background, slate-900 cards, slate-800 borders
```

### Typography
- Font: **Inter** (Google Fonts)
- Body: `text-sm text-slate-200/300`
- Labels: `text-xs font-medium uppercase tracking-wide text-slate-500`
- Headings: `text-2xl font-bold tracking-tight text-white`

### Animations
```js
"fade-in": fadeIn 0.35s ease-out  // opacity 0→1, translateY 6px→0
"shimmer": shimmer 1.2s ease-in-out infinite  // for skeleton loading
```

### Shadows
```js
glow:  "0 0 40px -10px rgba(99, 102, 241, 0.35)"  // brand glow
panel: "0 4px 24px -4px rgba(0, 0, 0, 0.45)"
```

### CSS utilities (in `index.css`)
```css
.focus-ring     /* brand-500/50 outline ring on focus */
.text-gradient  /* brand indigo-to-violet gradient text */
.surface-grid   /* dark grid background for auth pages */
```

---

## Validation Rules

- **No `required` HTML attribute anywhere** — all validation is custom JavaScript with themed inline error messages
- Error state: red border (`border-rose-500/70`) + inline `! message` below the field
- Error clears automatically when user starts typing
- **No `window.confirm` or `window.alert`** — all confirmations use `ConfirmDialog`
- **No browser `<select>` or `<input type="datetime-local">`** — all replaced with custom components

---

## Authentication Flow

1. JWT stored in `localStorage` under key `"token"`
2. Axios request interceptor adds `Authorization: Bearer <token>` to every request
3. Axios response interceptor: on 401, clears token and redirects to `/login`
4. `AuthContext` exposes: `user`, `token`, `loading`, `login()`, `signup()`, `logout()`, `refreshMe()`
5. `refreshMe()` is deduplicated — concurrent calls share one in-flight request via `useRef`
6. `logout()` clears localStorage + calls `queryClient.clear()` to wipe all cached data
7. `ProtectedRoute` wraps all authenticated pages; redirects to `/login` if no token

---

## Environment Variables

```env
DATABASE_URL=sqlite:///./team_task_manager.db
SECRET_KEY=change-me-in-production-use-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
CORS_ORIGINS=
```

Production (Railway):
```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DB
SECRET_KEY=<random 32+ character string>
ENVIRONMENT=production
CORS_ORIGINS=   # leave empty if SPA served from same host as API
```

---

## Dockerfile (multi-stage)

```dockerfile
# Stage 1: build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./static
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

In `main.py`, FastAPI serves the built React app from `./static` for all non-API paths (SPA fallback). This means the entire app (API + UI) runs from a single Railway service on a single URL.

---

## Local Development Commands

```powershell
# From project root (Windows PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:PYTHONPATH = (Get-Location).Path

# Run both servers together:
npx --yes concurrently -n api,ui -c blue,green `
  ".\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --reload-dir backend --port 8000" `
  "npm run dev --prefix frontend"
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`

> **Important:** Always use `.\.venv\Scripts\python.exe` (full path) instead of plain `python` in the uvicorn command to prevent the reload subprocess from accidentally picking up a different Python installation on the machine.

---

## Railway Deployment Steps

1. Push code to GitHub
2. On [railway.app](https://railway.app), create a new project → "Deploy from GitHub repo"
3. Add a **PostgreSQL** plugin, copy the connection string
4. Set environment variables in Railway dashboard:
   - `DATABASE_URL` → PostgreSQL connection string (`postgresql+psycopg://...`)
   - `SECRET_KEY` → random string ≥ 32 characters
   - `ENVIRONMENT` → `production`
5. Railway auto-detects `Dockerfile` (configured in `railway.json`)
6. Set health check path to `/health`
7. Deploy — the live URL never changes for subsequent pushes

---

## Key Implementation Details

### First-user Admin promotion
```python
# In POST /api/auth/signup
user_count = db.query(User).count()
role = UserRole.Admin if user_count == 0 else UserRole.Member
```

### Last-admin protection
```python
# In PATCH /api/users/{id}/role
if target.role == "Admin" and new_role == "Member":
    admin_count = db.query(User).filter(User.role == "Admin").count()
    if admin_count <= 1:
        raise HTTPException(400, "At least one admin is required")
```

### React Query setup
```ts
export const qk = {
  me: ["me"],
  projects: ["projects"],
  project: (id: number) => ["project", id],
  projectMembers: (id: number) => ["projectMembers", id],
  tasks: ["tasks"],
  dashboard: ["dashboard"],
  users: ["users"],
}
```

### CORS (production)
When `ENVIRONMENT=production` and `CORS_ORIGINS` is empty, backend allows `*.railway.app` origins via `allow_origin_regex`. This handles the single-service Docker setup where UI and API share the same hostname.

---

## What NOT to do (learned from building this)

- Do NOT use `window.confirm`, `window.alert`, or `window.prompt` — replace with `ConfirmDialog`
- Do NOT use `<select>` — replace with custom `Select` component
- Do NOT use `<input type="datetime-local">` — replace with custom `DateTimePicker`
- Do NOT use the `required` HTML attribute on inputs — replace with custom inline validation
- Do NOT use plain `python -m uvicorn` in development on Windows if multiple Python versions are installed — always use the full `.venv` path
- Do NOT send `role` from the frontend on signup — role is determined server-side
- Do NOT store passwords in plain text — always use bcrypt (`passlib[bcrypt]`)
- Do NOT hardcode `SECRET_KEY` in production — validate it's strong at startup

---

*Generated from a fully working production-ready project. All components, API contracts, and design decisions described above are battle-tested.*
