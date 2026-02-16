"""Pydantic schemas for document requests and responses."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel


# ── Nested response schemas ────────────────────────────


class ExtractionResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    extracted_data: dict[str, Any]
    model_used: str | None = None
    processing_ms: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClauseResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    clause_type: str
    original_text: str
    plain_summary: str | None = None
    risk_level: str | None = None
    risk_reason: str | None = None
    confidence: Decimal | None = None
    page_number: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Document responses ─────────────────────────────────


class DocumentResponse(BaseModel):
    """Returned by list and upload endpoints."""

    id: uuid.UUID
    team_id: uuid.UUID
    uploaded_by: uuid.UUID
    filename: str
    file_size_bytes: int | None = None
    page_count: int | None = None
    doc_type: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentUploadResponse(BaseModel):
    """Returned after a successful upload — includes the Celery task ID."""

    document: DocumentResponse
    task_id: str


class DocumentDetailResponse(BaseModel):
    """Returned by the detail endpoint — includes extractions and clauses."""

    id: uuid.UUID
    team_id: uuid.UUID
    uploaded_by: uuid.UUID
    filename: str
    file_size_bytes: int | None = None
    page_count: int | None = None
    raw_text: str | None = None
    doc_type: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None
    extractions: list[ExtractionResponse] = []
    clauses: list[ClauseResponse] = []

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    documents: list[DocumentResponse]
    total: int
    limit: int
    offset: int
