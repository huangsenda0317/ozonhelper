"""AI 改图/翻译相关 Pydantic Schemas"""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class ImageEditRequest(BaseModel):
    """AI 改图请求（SeedEdit 3.0）。"""
    collected_product_id: str | None = None
    image_ids: list[str] = Field(default=['all'], description='图片 ID 列表，["all"] 处理所有')
    image_urls: list[str] | None = Field(default=None, description='上传图片的预签名 URL 列表')
    object_names: list[str] | None = Field(default=None, description='MinIO 对象名，用于重试时重新生成 URL')
    prompt: str = Field(
        default='去除图片中的所有中文水印和文字，把背景换成白色纯色背景',
        max_length=800,
        description='SeedEdit 编辑提示词，建议 ≤120 字符'
    )
    seed: int = Field(default=-1, ge=-1, description='随机种子，-1 随机，相同正整数 → 大概率相同输出')
    scale: float = Field(default=0.5, ge=0, le=1, description='编辑强度 0-1，越大指令越强')

    @model_validator(mode='after')
    def validate_image_source(self):
        has_upload = bool(self.image_urls)
        has_product = bool(self.collected_product_id)
        if not has_upload and not has_product:
            raise ValueError('必须提供 image_urls 或 collected_product_id')
        return self


class UploadImageResponse(BaseModel):
    """图片上传响应。"""
    object_name: str
    url: str


class TranslateRequest(BaseModel):
    """AI 翻译请求（腾讯云 TMT）。"""
    collected_product_id: str
    fields: list[str] = Field(default=['title', 'description'], description='翻译字段')
    source_lang: str = Field(default='zh')
    target_lang: str = Field(default='ru')
    untranslated_text: str | None = Field(default=None, max_length=200, description='不希望翻译的标记文本')


class TranslateTextRequest(BaseModel):
    """同步文本翻译请求（腾讯云 TMT）。"""
    source_text: str = Field(..., min_length=1, max_length=6000, description='待翻译原文')
    source_lang: str = Field(default='zh')
    target_lang: str = Field(default='ru')
    untranslated_text: str | None = Field(default=None, max_length=200, description='不希望翻译的标记文本')

    @model_validator(mode='after')
    def validate_source_text(self):
        if not self.source_text.strip():
            raise ValueError('待翻译文本不能为空')
        return self


class TranslateTextResponse(BaseModel):
    """同步文本翻译响应。"""
    target_text: str
    used_amount: int
    source_lang: str
    target_lang: str


class TaskProgressResponse(BaseModel):
    """SeedEdit 任务进度响应。"""
    task_id: str
    seededit_status: str | None
    items_total: int = 0
    items_completed: int = 0


class TaskResponse(BaseModel):
    """AI 任务详情响应。"""
    id: str
    collected_product_id: str | None
    task_type: str
    status: str
    input_data: dict | None
    output_data: dict | None
    seededit_status: str | None
    error_message: str | None
    error_code: str | None
    retry_count: int
    cost_amount: float
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """AI 任务列表响应。"""
    items: list[TaskResponse]
    total: int
    page: int
    limit: int


class RetryRequest(BaseModel):
    """重试 AI 改图请求。"""
    prompt: str | None = Field(default=None, max_length=800)
    scale: float | None = Field(default=None, ge=0, le=1)


class OutputOverrideRequest(BaseModel):
    """手动覆盖 AI 输出。"""
    output_data: dict
