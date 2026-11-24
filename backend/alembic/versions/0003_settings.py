"""Add the settings table (US-007.1: Settings data model and migration).

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("export_limit", sa.Integer(), nullable=False, server_default="100"),
    )


def downgrade() -> None:
    op.drop_table("settings")
