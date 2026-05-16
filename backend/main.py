from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from backend.config import settings
from backend.database.database import Base, SessionLocal, engine
from backend.routers import auth, comments, dashboard, projects, tasks, users


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.is_production:
        key = settings.SECRET_KEY or ""
        if len(key) < 32 or "change-me" in key.lower() or "replace" in key.lower():
            raise RuntimeError(
                "SECRET_KEY must be a strong random string of >=32 characters in production."
            )
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Team Task Manager API", version="1.0.0", lifespan=lifespan)


origins = settings.cors_origin_list()
if settings.is_production and not origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://([a-z0-9-]+\.)*railway\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(comments.router)
app.include_router(dashboard.router)
app.include_router(users.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> JSONResponse:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return JSONResponse({"status": "ready"})
    except Exception as exc:
        return JSONResponse({"status": "unavailable", "error": str(exc)}, status_code=503)


STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path in {"health", "ready", "docs", "openapi.json", "redoc"}:
            raise HTTPException(status_code=404, detail="Not found")
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=False,
    )
