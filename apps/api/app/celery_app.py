"""Celery application instance for background task processing."""

import os

from celery import Celery

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery = Celery(
    "docpilot",
    broker=redis_url,
    backend=redis_url,
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

# Auto-discover tasks inside app/tasks/
celery.autodiscover_tasks(["app.tasks"])
