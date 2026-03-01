#!/bin/bash
# Production start script — runs Alembic migrations then starts the API server.
#
# Railway (and other PaaS platforms) call this instead of the Dockerfile CMD.
# Set the start command in Railway to: bash start.sh
#
# PORT is injected by Railway automatically.
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
