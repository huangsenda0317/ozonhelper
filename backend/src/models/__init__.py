"""注册所有 ORM 模型 — 确保 SQLAlchemy metadata 包含完整表关系（Worker / Alembic 依赖）"""

from src.models.api_key import ApiKey  # noqa: F401
from src.models.collected_product import CollectedProduct  # noqa: F401
from src.models.processing_task import ProcessingTask  # noqa: F401
from src.models.ranked_product import RankedProduct  # noqa: F401
from src.models.selected_product import SelectedProduct  # noqa: F401
from src.models.sourcing import ProfitCalculation, SupplySource  # noqa: F401
from src.models.store import Store  # noqa: F401
from src.models.tracking_sync import (  # noqa: F401
    Alert,
    AnalyticsDaily,
    InventoryAlertConfig,
    InventorySnapshot,
    SyncJob,
    SyncedOrder,
    SyncedProduct,
)
from src.models.user import User  # noqa: F401
