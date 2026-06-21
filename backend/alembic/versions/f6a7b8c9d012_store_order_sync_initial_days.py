"""add order_sync_initial_days to stores

Revision ID: f6a7b8c9d012
Revises: e5f6a7b8c901
Create Date: 2026-06-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f6a7b8c9d012'
down_revision: Union[str, None] = 'e5f6a7b8c901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'stores',
        sa.Column('order_sync_initial_days', sa.Integer(), server_default='30', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('stores', 'order_sync_initial_days')
