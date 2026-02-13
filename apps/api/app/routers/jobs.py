"""SSE endpoint for real-time pipeline progress updates."""

import asyncio
import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis as AsyncRedis

from app.config import settings

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}/status")
async def job_status_stream(job_id: str, request: Request):
    """Stream pipeline progress for a job via Server-Sent Events.

    The Celery worker publishes progress updates to a Redis pub/sub
    channel named ``job:<job_id>``.  This endpoint subscribes to that
    channel and forwards each message as an SSE event.

    The stream closes automatically when progress reaches 100 (success)
    or -1 (failure), or when the client disconnects.
    """

    async def event_generator():
        r = AsyncRedis.from_url(settings.redis_url, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe(f"job:{job_id}")

        try:
            while True:
                # Check if the client has disconnected
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )

                if message and message["type"] == "message":
                    data = message["data"]
                    yield f"data: {data}\n\n"

                    # Close the stream when complete or failed
                    parsed = json.loads(data)
                    progress = parsed.get("progress")
                    if progress == 100 or progress == -1:
                        break
                else:
                    # Send a heartbeat comment to keep the connection alive
                    yield ": heartbeat\n\n"
                    await asyncio.sleep(1)
        finally:
            await pubsub.unsubscribe(f"job:{job_id}")
            await pubsub.close()
            await r.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
