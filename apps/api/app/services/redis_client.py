"""Synchronous Redis helpers for Celery workers (pub/sub progress updates)."""

import json

import redis as sync_redis

from app.config import settings

# Lazy-initialised sync Redis connection (Celery workers are sync)
_redis: sync_redis.Redis | None = None


def _get_redis() -> sync_redis.Redis:
    global _redis
    if _redis is None:
        _redis = sync_redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def publish_job_status(job_id: str, data: dict) -> None:
    """Publish a progress update to the Redis pub/sub channel for a job.

    The SSE endpoint subscribes to `job:{job_id}` and forwards these
    messages to the client.
    """
    channel = f"job:{job_id}"
    _get_redis().publish(channel, json.dumps(data))
