"""FastAPI 应用入口 — 初始化、CORS、路由注册、异常处理"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.error_handler import AppException, app_exception_handler, general_exception_handler
from src.api.exceptions import AppException
from src.api.logging_middleware import LoggingMiddleware
from src.bootstrap.admin_user import bootstrap_admin_user
from src.services.crypto import validate_encryption_key
from src.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理。"""
    # 启动时
    print('🚀 OzonHelper API 启动中...')
    try:
        validate_encryption_key(get_settings().encryption_key)
    except AppException as exc:
        print(f'❌ 启动失败: {exc.message}')
        raise
    await bootstrap_admin_user()
    yield
    # 关闭时
    print('👋 OzonHelper API 关闭')


app = FastAPI(
    title='OzonHelper API',
    description='Ozon 跟卖全链路平台 - 后端 API 服务',
    version='1.0.0',
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# 请求日志中间件
app.add_middleware(LoggingMiddleware)

# 异常处理器
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)


# 健康检查
@app.get('/api/v1/health')
async def health_check():
    return {'status': 'ok', 'version': '1.0.0'}


# 路由注册
from src.api.auth import router as auth_router
from src.api.rankings import router as rankings_router
from src.api.selection_pool import router as selection_pool_router
from src.api.ai_endpoints import router as ai_router
from src.api.products import router as products_router
from src.api.exchange_rate import router as exchange_rate_router
from src.api.stores import router as stores_router
from src.api.tracking import router as tracking_router

app.include_router(auth_router, tags=['认证'])
app.include_router(stores_router, tags=['店铺管理'])
app.include_router(rankings_router, tags=['榜单发现'])
app.include_router(selection_pool_router, tags=['选品池'])
app.include_router(ai_router, tags=['AI 处理'])
app.include_router(products_router, tags=['商品采集'])
app.include_router(exchange_rate_router, tags=['汇率'])
app.include_router(tracking_router, tags=['店铺跟踪'])
