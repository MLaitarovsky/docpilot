"""DocPilot API — FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine

# Import all models so they're registered with SQLAlchemy metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Startup / shutdown lifecycle hook."""
    yield
    # Dispose the connection pool on shutdown
    await engine.dispose()


app = FastAPI(
    title="DocPilot API",
    version="0.1.0",
    description="AI-powered contract review and extraction platform",
    lifespan=lifespan,
)

# Allow the Next.js frontend during local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"data": {"status": "ok"}, "error": None}
