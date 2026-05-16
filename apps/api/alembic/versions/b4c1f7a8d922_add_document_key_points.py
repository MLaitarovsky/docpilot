"""add documents.key_points

Revision ID: b4c1f7a8d922
Revises: a3b9d4e2c811
Create Date: 2026-05-16 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "b4c1f7a8d922"
down_revision: str | None = "a3b9d4e2c811"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("key_points", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "key_points")
