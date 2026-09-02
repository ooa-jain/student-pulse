import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import close_client, init_indexes
from .routers import admin, survey

log = logging.getLogger("ai-pulse")

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_indexes()
        log.info("MongoDB indexes ready (db=%s)", settings.mongo_db)
    except Exception as exc:  # keep the app up so /api/health can report it
        log.warning("MongoDB not reachable at startup: %s", exc)
    yield
    await close_client()


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="AI Pulse — JAIN Office of Academics AI-readiness survey",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(survey.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health():
    from .db import get_client

    try:
        await get_client().admin.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "database": "connected" if db_ok else "unreachable"}


if settings.serve_frontend and FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
