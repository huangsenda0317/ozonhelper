"""shop tracking erp phase2 tables

Revision ID: c8f5d2e1a904
Revises: b7e4a1c2d903
Create Date: 2026-06-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'c8f5d2e1a904'
down_revision: Union[str, None] = 'b7e4a1c2d903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('synced_products', sa.Column('listing_job_id', sa.UUID(), nullable=True))
    op.add_column('synced_orders', sa.Column('packed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('synced_orders', sa.Column('shipped_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('synced_orders', sa.Column('last_tracking_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('synced_orders', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('synced_orders', sa.Column('tracking_status', sa.String(length=64), nullable=True))
    op.add_column('synced_orders', sa.Column('tracking_events', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('synced_orders', sa.Column('seller_note', sa.Text(), nullable=True))

    op.create_table(
        'price_snapshots',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.String(length=64), nullable=False),
        sa.Column('offer_id', sa.String(length=256), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('old_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('min_price_ozon', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=8), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'product_id', name='uq_price_snapshots_store_product'),
    )
    op.create_index('ix_price_snapshots_store_id', 'price_snapshots', ['store_id'])

    op.create_table(
        'profit_configs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('offer_id', sa.String(length=256), nullable=False),
        sa.Column('purchase_cost', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('logistics_cost', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('platform_fee_rate', sa.Numeric(precision=6, scale=4), nullable=False),
        sa.Column('exchange_rate', sa.Numeric(precision=12, scale=6), nullable=False),
        sa.Column('margin_buffer', sa.Numeric(precision=6, scale=4), nullable=False),
        sa.Column('max_price_threshold', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'offer_id', name='uq_profit_configs_store_offer'),
    )
    op.create_index('ix_profit_configs_store_id', 'profit_configs', ['store_id'])

    op.create_table(
        'exchange_rates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('from_currency', sa.String(length=8), nullable=False),
        sa.Column('to_currency', sa.String(length=8), nullable=False),
        sa.Column('rate', sa.Numeric(precision=12, scale=6), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_exchange_rates_store_id', 'exchange_rates', ['store_id'])

    op.create_table(
        'listing_jobs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('filename', sa.String(length=256), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('total_items', sa.Integer(), nullable=False),
        sa.Column('success_count', sa.Integer(), nullable=False),
        sa.Column('failed_count', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_listing_jobs_store_id', 'listing_jobs', ['store_id'])

    op.create_table(
        'listing_items',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('offer_id', sa.String(length=256), nullable=False),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('category_id', sa.String(length=64), nullable=True),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('primary_image_url', sa.Text(), nullable=True),
        sa.Column('attributes_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('ozon_task_id', sa.String(length=128), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['listing_jobs.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_listing_items_job_id', 'listing_items', ['job_id'])

    op.create_table(
        'finance_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('transaction_id', sa.String(length=128), nullable=False),
        sa.Column('tx_type', sa.String(length=64), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=8), nullable=False),
        sa.Column('posting_number', sa.String(length=128), nullable=True),
        sa.Column('sku', sa.String(length=64), nullable=True),
        sa.Column('operation_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'transaction_id', name='uq_finance_tx_store_tx'),
    )
    op.create_index('ix_finance_transactions_store_id', 'finance_transactions', ['store_id'])

    op.create_table(
        'return_orders',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('return_id', sa.String(length=128), nullable=False),
        sa.Column('posting_number', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=64), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'return_id', name='uq_return_orders_store_return'),
    )
    op.create_index('ix_return_orders_store_id', 'return_orders', ['store_id'])

    op.create_table(
        'logistics_alert_configs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('node_type', sa.String(length=32), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('threshold_days', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'node_type', name='uq_logistics_alert_configs_store_node'),
    )
    op.create_index('ix_logistics_alert_configs_store_id', 'logistics_alert_configs', ['store_id'])

    op.create_table(
        'logistics_alert_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('posting_number', sa.String(length=128), nullable=False),
        sa.Column('node_type', sa.String(length=32), nullable=False),
        sa.Column('overdue_days', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('handled_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'posting_number', 'node_type', name='uq_logistics_events'),
    )
    op.create_index('ix_logistics_alert_events_store_id', 'logistics_alert_events', ['store_id'])

    op.create_table(
        'review_alerts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('review_id', sa.String(length=128), nullable=False),
        sa.Column('product_id', sa.String(length=64), nullable=True),
        sa.Column('sku', sa.String(length=64), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'review_id', name='uq_review_alerts_store_review'),
    )
    op.create_index('ix_review_alerts_store_id', 'review_alerts', ['store_id'])

    op.create_table(
        'operation_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('operation_type', sa.String(length=32), nullable=False),
        sa.Column('reference_id', sa.String(length=128), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_operation_logs_store_id', 'operation_logs', ['store_id'])


def downgrade() -> None:
    op.drop_table('operation_logs')
    op.drop_table('review_alerts')
    op.drop_table('logistics_alert_events')
    op.drop_table('logistics_alert_configs')
    op.drop_table('return_orders')
    op.drop_table('finance_transactions')
    op.drop_table('listing_items')
    op.drop_table('listing_jobs')
    op.drop_table('exchange_rates')
    op.drop_table('profit_configs')
    op.drop_table('price_snapshots')
    op.drop_column('synced_orders', 'seller_note')
    op.drop_column('synced_orders', 'tracking_events')
    op.drop_column('synced_orders', 'tracking_status')
    op.drop_column('synced_orders', 'delivered_at')
    op.drop_column('synced_orders', 'last_tracking_at')
    op.drop_column('synced_orders', 'shipped_at')
    op.drop_column('synced_orders', 'packed_at')
    op.drop_column('synced_products', 'listing_job_id')
