"""User model — authentication and team membership."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.team import Team


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("teams.id"),
        default=None,
    )
    role: Mapped[str] = mapped_column(String(20), default="member")

    # Relationships
    team: Mapped["Team | None"] = relationship(back_populates="members")
