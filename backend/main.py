from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.database import Base, engine, get_db
from backend.models import models  # noqa: F401 — register models with Base.metadata
from backend.routers import auth, dashboard, projects, tasks, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.is_production:
        if len(settings.SECRET_KEY) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 characters when ENVIRONMENT=production")
        low = settings.SECRET_KEY.lower()
        if "change-me" in low or "replace" in low:
            raise RuntimeError("Use a strong unique SECRET_KEY when ENVIRONMENT=production")
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Ethara Workboard API", version="1.0.0", lifespan=lifespan)

_origins = settings.cors_origin_list()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(projects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    """Readiness: verifies database connectivity (use behind load balancers)."""
    try:
        _ = db.execute(text("SELECT 1")).scalar_one()
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")
    return {"status": "ready"}


static_dir = Path(__file__).resolve().parent.parent / "static"


@app.get("/{full_path:path}")
def spa(full_path: str):
    """Serve built SPA when `static/` exists (production Docker image)."""
    if ".." in full_path.split("/"):
        raise HTTPException(status_code=404, detail="Not found")
    if not static_dir.is_dir():
        raise HTTPException(status_code=404, detail="Not found")
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not found")
    candidate = static_dir / full_path
    try:
        candidate.resolve().relative_to(static_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")
    if candidate.is_file():
        return FileResponse(candidate)
    index = static_dir / "index.html"
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Not found")
