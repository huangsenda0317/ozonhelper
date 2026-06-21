"""同步任务 schemas"""

from pydantic import BaseModel


class SyncTriggerRequest(BaseModel):
    scope: str = 'quick'  # quick | products | inventory | orders | all


class SyncJobResponse(BaseModel):
    id: str
    store_id: str
    job_type: str
    scope: str
    status: str
    records_processed: int
    error_message: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    created_at: str
