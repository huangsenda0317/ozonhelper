"""Ozon Seller API 客户端 Phase2 方法测试"""

from unittest.mock import AsyncMock, patch

import pytest

from src.services.ozon.client import OzonSellerClient


@pytest.fixture
def client():
    return OzonSellerClient(
        __import__('src.config', fromlist=['get_settings']).get_settings(),
        client_id='test-id',
        api_key='test-key',
    )


@pytest.mark.asyncio
async def test_price_import(client):
    with patch.object(client, '_post', new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {'result': []}
        await client.price_import(prices=[{'offer_id': 'SKU1', 'price': '100', 'currency_code': 'RUB'}])
        mock_post.assert_called_once()
        assert mock_post.call_args[0][0] == '/v1/product/import/prices'


@pytest.mark.asyncio
async def test_product_import(client):
    with patch.object(client, '_post', new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {'result': {'task_id': 123}}
        await client.product_import(items=[{'offer_id': 'SKU1', 'name': 'Test'}])
        mock_post.assert_called_once_with('/v3/product/import', {'items': [{'offer_id': 'SKU1', 'name': 'Test'}]})


@pytest.mark.asyncio
async def test_posting_fbs_ship(client):
    with patch.object(client, '_post', new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {'result': True}
        await client.posting_fbs_ship(posting_number='PN-1', packages=[{'products': []}])
        mock_post.assert_called_once()


@pytest.mark.asyncio
async def test_finance_transaction_list(client):
    with patch.object(client, '_post', new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {'result': {'operations': []}}
        await client.finance_transaction_list(date_from='2026-01-01', date_to='2026-01-31')
        mock_post.assert_called_once()
        assert '/v3/finance/transaction/list' in mock_post.call_args[0][0]
