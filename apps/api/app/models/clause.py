"""Clause model — individual contract clauses with risk analysis."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.document import Document


class Clause(Base):
    __tablename__ = "clauses"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
    )
    clause_type: Mapped[str] = mapped_column(String(100))
    original_text: Mapped[str] = mapped_column(Text)
    plain_summary: Mapped[str | None] = mapped_column(Text, default=None)
    risk_level: Mapped[str | None] = mapped_column(String(10), default=None)
    risk_reason: Mapped[str | None] = mapped_column(Text, default=None)
    confidence: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2),
        default=None,
    )
    page_number: Mapped[int | None] = mapped_column(Integer, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="clauses")
