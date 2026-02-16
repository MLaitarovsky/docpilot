"""Pydantic schemas for comparison requests and responses."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class CompareRequest(BaseModel):
    doc_a_id: uuid.UUID
    doc_b_id: uuid.UUID


class ComparisonResponse(BaseModel):
    """A single comparison record with doc filenames included."""

    id: uuid.UUID
    doc_a_id: uuid.UUID
    doc_b_id: uuid.UUID
    doc_a_filename: str
    doc_b_filename: str
    diff_result: dict[str, Any]
    created_by: uuid.UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ComparisonListResponse(BaseModel):
    """Paginated list of comparisons."""

    comparisons: list[ComparisonResponse]
    total: int
    limit: int
    offset: int
