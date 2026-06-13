"""全局异常处理中间件 — 统一 ApiResponse 格式"""

from fastapi import Request, status
from fastapi.responses import JSONResponse

from src.api.exceptions import AppException
from src.schemas.common import ApiError, ApiResponse


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """处理应用自定义异常。"""
    return JSONResponse(
        status_code=exc.http_status,
        content=ApiResponse(
            success=False,
            error=ApiError(code=exc.code, message=exc.message),
        ).model_dump(),
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """处理未预期的通用异常。"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ApiResponse(
            success=False,
            error=ApiError(code='INTERNAL_ERROR', message='服务器内部错误，请稍后重试'),
        ).model_dump(),
    )
