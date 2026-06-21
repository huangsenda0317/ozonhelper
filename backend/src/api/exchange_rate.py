"""汇率 API 路由"""

from fastapi import APIRouter, Depends

from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.common import ApiResponse
from src.services.phase2.exchange_rate import get_exchange_rate_payload

router = APIRouter(prefix='/api/v1', tags=['汇率'])


@router.get('/exchange-rate', response_model=ApiResponse[dict])
async def get_exchange_rate(
    current_user: User = Depends(get_current_user),
):
    """获取当前 CNY/RUB 汇率（公共接口，Redis 缓存 24h）。"""
    return ApiResponse(success=True, data=await get_exchange_rate_payload())
