"""add posting_order_date to finance_transactions

Revision ID: e5f6a7b8c901
Revises: d4a8f1c2e905
Create Date: 2026-06-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e5f6a7b8c901'
down_revision: Union[str, None] = 'd4a8f1c2e905'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'finance_transactions',
        sa.Column('posting_order_date', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        'ix_finance_transactions_posting_order_date',
        'finance_transactions',
        ['store_id', 'posting_order_date'],
    )


def downgrade() -> None:
    op.drop_index('ix_finance_transactions_posting_order_date', table_name='finance_transactions')
    op.drop_column('finance_transactions', 'posting_order_date')
