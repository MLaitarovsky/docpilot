"""Document model — uploaded PDF contracts and their extracted text."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.clause import Clause
    from app.models.extraction import Extraction
    from app.models.team import Team
    from app.models.user import User


class Document(TimestampMixin, Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String(500))
    file_path: Mapped[str] = mapped_column(String(1000))
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, default=None)
    page_count: Mapped[int | None] = mapped_column(Integer, default=None)
    raw_text: Mapped[str | None] = mapped_column(Text, default=None)
    doc_type: Mapped[str | None] = mapped_column(String(50), default=None)
    status: Mapped[str] = mapped_column(String(20), default="uploaded")

    # Relationships
    team: Mapped["Team"] = relationship(back_populates="documents")
    uploader: Mapped["User"] = relationship(foreign_keys=[uploaded_by])
    extractions: Mapped[list["Extraction"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )
    clauses: Mapped[list["Clause"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )
