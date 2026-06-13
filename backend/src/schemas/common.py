"""通用 API 响应模型与分页"""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """通用 API 响应格式。"""
    success: bool = True
    data: T | None = None
    error: 'ApiError | None' = None
    meta: 'PaginationMeta | None' = None


class ApiError(BaseModel):
    """API 错误信息。"""
    code: str
    message: str


class PaginationMeta(BaseModel):
    """分页元数据。"""
    total: int
    page: int
    limit: int


class PaginationParams(BaseModel):
    """分页查询参数。"""
    page: int = 1
    limit: int = 50


class SortParams(BaseModel):
    """排序查询参数。"""
    sort_by: str = 'created_at'
    sort_order: str = 'desc'  # asc / desc
