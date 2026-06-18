"""Celery 应用实例 — 异步任务队列"""

from celery import Celery

from src.config import get_settings
import src.models  # noqa: F401 — 注册全部 ORM 模型，避免 Worker 中 FK 解析失败

settings = get_settings()

celery_app = Celery(
    'ozonhelper',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        'src.worker.scraper_tasks',
        'src.worker.ai_tasks',
        'src.worker.sync_tasks',
        'src.worker.phase2_tasks',
    ],
)

celery_app.conf.beat_schedule = {
    'sync-all-stores-every-15-min': {
        'task': 'sync_all_active_stores',
        'schedule': 900.0,
    },
    'phase2-sync-every-30-min': {
        'task': 'phase2_sync_all_stores',
        'schedule': 1800.0,
    },
}

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Shanghai',
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
