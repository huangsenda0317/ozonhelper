"""预警 schemas"""

from pydantic import BaseModel


class AlertItem(BaseModel):
    id: str
    alert_type: str
    reference_id: str
    title: str
    message: str | None = None
    severity: str
    status: str
    created_at: str
