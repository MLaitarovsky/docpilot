"""add annotations table and user notify_on_complete

Revision ID: a3b9d4e2c811
Revises: f8e2a1c9b347
Create Date: 2026-04-29 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a3b9d4e2c811"
down_revision: str | None = "f8e2a1c9b347"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "notify_on_complete",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    op.create_table(
        "annotations",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "clause_id",
            sa.UUID(),
            sa.ForeignKey("clauses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_annotations_clause_id",
        "annotations",
        ["clause_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_annotations_clause_id", table_name="annotations")
    op.drop_table("annotations")
    op.drop_column("users", "notify_on_complete")
