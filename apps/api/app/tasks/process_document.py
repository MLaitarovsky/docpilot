"""Celery task — processes an uploaded document through the AI pipeline."""

import logging

from app.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(name="process_document", bind=True)
def process_document(self, document_id: str) -> dict:
    """Run the full extraction pipeline for a document.

    This is a placeholder that will be replaced with the real pipeline
    in Part B. For now it just logs and returns.
    """
    logger.info("Processing document %s (task %s)", document_id, self.request.id)

    # TODO: Part B — wire up ExtractionPipeline here
    # Steps:
    #   1. Extract text from PDF
    #   2. Chunk text
    #   3. Classify document type
    #   4. Extract fields based on doc_type
    #   5. Analyze clauses for risk

    return {"status": "completed", "document_id": document_id}
