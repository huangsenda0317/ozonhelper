"""store order_sync_initial_days default 7

Revision ID: g7b8c9d0e123
Revises: f6a7b8c9d012
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'g7b8c9d0e123'
down_revision: Union[str, None] = 'f6a7b8c9d012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('stores', 'order_sync_initial_days', server_default='7')


def downgrade() -> None:
    op.alter_column('stores', 'order_sync_initial_days', server_default='30')
