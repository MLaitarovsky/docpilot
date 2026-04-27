"""add enrichment columns to documents and clauses

Revision ID: f8e2a1c9b347
Revises: 73dbca1366d1
Create Date: 2026-04-27 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "f8e2a1c9b347"
down_revision: str | None = "73dbca1366d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("executive_summary", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("risk_score", sa.String(10), nullable=True))
    op.add_column(
        "documents",
        sa.Column("missing_clauses", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("documents", sa.Column("detected_language", sa.String(10), nullable=True))
    op.add_column("clauses", sa.Column("suggested_alternative", sa.Text(), nullable=True))
    op.add_column("clauses", sa.Column("unfavorable_to", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("clauses", "unfavorable_to")
    op.drop_column("clauses", "suggested_alternative")
    op.drop_column("documents", "detected_language")
    op.drop_column("documents", "missing_clauses")
    op.drop_column("documents", "risk_score")
    op.drop_column("documents", "executive_summary")
