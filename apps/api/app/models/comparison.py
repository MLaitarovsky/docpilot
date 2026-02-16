"""Comparison model — side-by-side diff of two documents."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Comparison(Base):
    __tablename__ = "comparisons"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("teams.id"),
        default=None,
    )
    doc_a_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id"),
        default=None,
    )
    doc_b_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id"),
        default=None,
    )
    diff_result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"),
        default=None,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
