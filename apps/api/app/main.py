"""DocPilot API — FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all models so they're registered with SQLAlchemy metadata
import app.models  # noqa: F401
from app.config import settings
from app.database import engine
from app.routers import annotations, auth, compare, documents, jobs, teams


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Startup / shutdown lifecycle hook."""
    # Ensure the upload directory exists (Railway may start with a clean fs)
    os.makedirs(settings.upload_dir, exist_ok=True)
    yield
    # Dispose the connection pool on shutdown
    await engine.dispose()


app = FastAPI(
    title="DocPilot API",
    version="0.1.0",
    description="AI-powered contract review and extraction platform",
    lifespan=lifespan,
)

# CORS — reads allowed origins from the CORS_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ────────────────────────────────────────────
app.include_router(annotations.router)
app.include_router(auth.router)
app.include_router(compare.router)
app.include_router(documents.router)
app.include_router(jobs.router)
app.include_router(teams.router)


@app.get("/api/health")
async def health_check():
    return {"data": {"status": "ok"}, "error": None}
