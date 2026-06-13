"""汇率 API 路由"""

from fastapi import APIRouter, Depends

from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.common import ApiResponse

router = APIRouter(prefix='/api/v1', tags=['汇率'])


@router.get('/exchange-rate', response_model=ApiResponse[dict])
async def get_exchange_rate(
    current_user: User = Depends(get_current_user),
):
    """获取当前 RUB/CNY 汇率。"""
    # 从 Redis 缓存读取，或调用 exchangerate-api.com
    # TODO: 实现汇率获取服务
    return ApiResponse(
        success=True,
        data={
            'rub_to_cny': 0.078,
            'updated_at': '2026-06-12T00:00:00Z',
        },
    )
