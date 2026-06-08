"""DocPilot API — FastAPI application entry point."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


logger = logging.getLogger(__name__)

app = FastAPI(
    title="DocPilot API",
    version="0.1.0",
    description="AI-powered contract review and extraction platform",
    lifespan=lifespan,
)


# Catch-all error handler. Added BEFORE CORS so the CORS middleware (added last,
# therefore outermost) wraps it and attaches Access-Control-Allow-Origin to the
# response. Without this, an unhandled exception returns a bare 500 with no CORS
# headers, which the browser reports to the frontend as a generic network/
# "Unable to reach the server" error instead of the real failure.
@app.middleware("http")
async def catch_unhandled_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:  # noqa: BLE001 — last-resort safety net
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "data": None,
                "error": {
                    "message": "Internal server error. Please try again.",
                    "code": "INTERNAL_ERROR",
                },
            },
        )


# CORS — reads allowed origins from the CORS_ORIGINS env var.
# Added last so it sits outermost and can add headers even to error responses.
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
