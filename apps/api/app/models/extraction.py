"""Extraction model — structured data pulled from a document by the LLM."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.document import Document


class Extraction(Base):
    __tablename__ = "extractions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
    )
    extracted_data: Mapped[dict[str, Any]] = mapped_column(JSONB)
    model_used: Mapped[str | None] = mapped_column(String(100), default=None)
    processing_ms: Mapped[int | None] = mapped_column(Integer, default=None)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="extractions")
