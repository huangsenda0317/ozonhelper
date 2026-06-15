"""shop tracking erp sync tables

Revision ID: b7e4a1c2d903
Revises: 1c2b0122e85d
Create Date: 2026-06-15
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'b7e4a1c2d903'
down_revision: Union[str, None] = '1c2b0122e85d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'synced_products',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.String(length=64), nullable=False),
        sa.Column('offer_id', sa.String(length=256), nullable=False),
        sa.Column('sku', sa.String(length=64), nullable=True),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=8), nullable=False),
        sa.Column('stock_present', sa.Integer(), nullable=False),
        sa.Column('status_name', sa.String(length=128), nullable=True),
        sa.Column('visibility', sa.String(length=32), nullable=True),
        sa.Column('is_exception', sa.Boolean(), nullable=False),
        sa.Column('exception_reason', sa.Text(), nullable=True),
        sa.Column('primary_image_url', sa.Text(), nullable=True),
        sa.Column('ordered_units', sa.Integer(), nullable=False),
        sa.Column('hits_view', sa.Integer(), nullable=False),
        sa.Column('conversion_rate', sa.Numeric(precision=8, scale=4), nullable=True),
        sa.Column('ozon_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'product_id', name='uq_synced_products_store_product'),
    )
    op.create_index('ix_synced_products_store_id', 'synced_products', ['store_id'])

    op.create_table(
        'inventory_snapshots',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.String(length=64), nullable=False),
        sa.Column('offer_id', sa.String(length=256), nullable=False),
        sa.Column('warehouse_id', sa.String(length=64), nullable=False),
        sa.Column('present', sa.Integer(), nullable=False),
        sa.Column('reserved', sa.Integer(), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'product_id', 'warehouse_id', name='uq_inventory_snapshots_store_product_wh'),
    )
    op.create_index('ix_inventory_snapshots_store_id', 'inventory_snapshots', ['store_id'])

    op.create_table(
        'synced_orders',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('posting_number', sa.String(length=128), nullable=False),
        sa.Column('order_id', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=64), nullable=False),
        sa.Column('fulfillment_type', sa.String(length=8), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('shipment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('products', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('total_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('is_overdue', sa.Boolean(), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'posting_number', name='uq_synced_orders_store_posting'),
    )
    op.create_index('ix_synced_orders_store_id', 'synced_orders', ['store_id'])

    op.create_table(
        'analytics_daily',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('day', sa.Date(), nullable=False),
        sa.Column('orders', sa.Integer(), nullable=False),
        sa.Column('units_sold', sa.Integer(), nullable=False),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('hits_view', sa.Integer(), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'day', name='uq_analytics_daily_store_day'),
    )
    op.create_index('ix_analytics_daily_store_id', 'analytics_daily', ['store_id'])

    op.create_table(
        'sync_jobs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('job_type', sa.String(length=32), nullable=False),
        sa.Column('scope', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('records_processed', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sync_jobs_store_id', 'sync_jobs', ['store_id'])

    op.create_table(
        'inventory_alert_configs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=False),
        sa.Column('order_overdue_hours', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', name='uq_inventory_alert_configs_store'),
    )

    op.create_table(
        'alerts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('alert_type', sa.String(length=32), nullable=False),
        sa.Column('reference_id', sa.String(length=128), nullable=False),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_alerts_store_id', 'alerts', ['store_id'])


def downgrade() -> None:
    op.drop_table('alerts')
    op.drop_table('inventory_alert_configs')
    op.drop_table('sync_jobs')
    op.drop_table('analytics_daily')
    op.drop_table('synced_orders')
    op.drop_table('inventory_snapshots')
    op.drop_table('synced_products')
