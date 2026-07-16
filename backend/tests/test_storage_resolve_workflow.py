"""storage 输入/输出 URL 解析（工作流 images[] / final_object_name）。"""

from src.storage import StorageClient


class _FakeStorage(StorageClient):
    """不连 MinIO，只测解析逻辑。"""

    def __init__(self):
        self.bucket = "ozonhelper-images"
        # 跳过 Minio 初始化

    def get_presigned_url(self, object_name: str, expires: int = 86400) -> str:
        return f"https://presigned.test/{object_name}?e={expires}"


def test_resolve_input_from_workflow_images():
    s = _FakeStorage()
    urls = s.resolve_input_image_urls(
        {
            "mode": "workflow",
            "images": [{"url": "https://old/x", "object_name": "products/a.jpg"}],
        }
    )
    assert urls == ["https://presigned.test/products/a.jpg?e=86400"]


def test_resolve_output_prefers_final_object():
    s = _FakeStorage()
    out = s.resolve_output_data(
        {
            "object_names": ["products/base.png"],
            "final_object_name": "products/processed/final.png",
            "ai_base_image_url": "https://stale/base",
            "final_image_url": "https://stale/final",
        }
    )
    assert out["final_image_url"] == "https://presigned.test/products/processed/final.png?e=86400"
    assert out["ai_base_image_url"] == "https://presigned.test/products/base.png?e=86400"
    assert out["processed_images"] == [
        "https://presigned.test/products/processed/final.png?e=86400"
    ]
