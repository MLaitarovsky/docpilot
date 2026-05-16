"""Celery task — processes an uploaded document through the AI pipeline."""

import logging
import uuid

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.celery_app import celery
from app.config import settings

logger = logging.getLogger(__name__)

# Build a sync DB URL from the async one.
# Handles both "postgresql+asyncpg://…" and plain "postgresql://…" forms.
_sync_url = settings.database_url.replace("+asyncpg", "").replace(
    "postgresql://", "postgresql+psycopg2://"
)

# NullPool = no connection pooling.  Each task opens a fresh connection
# and closes it when done.  This avoids two common Celery issues:
#   1. Forked worker processes inheriting stale pooled connections
#   2. Pooled connections holding old transaction snapshots
_sync_engine = create_engine(_sync_url, echo=False, poolclass=NullPool)
_SyncSession = sessionmaker(_sync_engine, expire_on_commit=False)


@celery.task(name="process_document", bind=True)
def process_document(self, document_id: str) -> dict:
    """Run the full extraction pipeline for a document.

    Creates a sync DB session (Celery is synchronous), runs all 5 pipeline
    steps, and publishes progress via Redis pub/sub.  On failure the
    document is marked as 'failed' and an error event is published.
    """
    from app.models.document import Document
    from app.services.extraction_pipeline import ExtractionPipeline
    from app.services.redis_client import publish_job_status

    job_id = self.request.id
    logger.info("Processing document %s (job %s)", document_id, job_id)

    db: Session = _SyncSession()
    try:
        pipeline = ExtractionPipeline(document_id, job_id, db)
        pipeline.run()

        # Best-effort: notify the uploader by email if they opted in
        try:
            _maybe_send_completion_email(db, document_id)
        except Exception:
            logger.exception(
                "Completion email step failed for %s; ignoring", document_id
            )

        return {"status": "completed", "document_id": document_id}

    except Exception as exc:
        logger.exception("Pipeline failed for document %s: %s", document_id, exc)

        # Roll back the failed transaction before retrying the query
        db.rollback()

        # Mark document as failed in a clean transaction
        try:
            doc = db.execute(
                select(Document).where(Document.id == uuid.UUID(document_id))
            ).scalar_one_or_none()
            if doc:
                doc.status = "failed"
                db.commit()
        except Exception:
            logger.exception("Could not mark document %s as failed", document_id)

        # Publish error event so the SSE stream can notify the client
        publish_job_status(
            job_id,
            {
                "step": 0,
                "total_steps": 5,
                "message": f"Processing failed: {exc}",
                "progress": -1,
            },
        )

        raise

    finally:
        db.close()


def _maybe_send_completion_email(db: Session, document_id: str) -> None:
    """Send a 'processing complete' email to the uploader if they opted in."""
    from app.models.document import Document
    from app.models.user import User
    from app.services.email_service import is_configured, send_processing_complete

    if not is_configured():
        return

    doc = db.execute(
        select(Document).where(Document.id == uuid.UUID(document_id))
    ).scalar_one_or_none()
    if doc is None:
        return

    user = db.execute(
        select(User).where(User.id == doc.uploaded_by)
    ).scalar_one_or_none()
    if user is None or not user.notify_on_complete:
        return

    send_processing_complete(
        to=user.email,
        user_name=user.full_name,
        document_name=doc.filename,
        document_id=str(doc.id),
        risk_score=doc.risk_score,
        doc_type=doc.doc_type,
    )
