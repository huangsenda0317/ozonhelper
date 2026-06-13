"""MinIO/S3 存储客户端 — 图片上传、预签名 URL、URL 下载转存"""

import io
import uuid
from datetime import timedelta

import httpx
from minio import Minio
from minio.error import S3Error

from src.config import get_settings

settings = get_settings()


class StorageClient:
    """MinIO/S3 图片存储客户端。"""

    def __init__(self):
        self.bucket = settings.minio_bucket
        self.client = self._make_client(settings.minio_endpoint, settings.minio_secure)
        public_endpoint = settings.minio_public_endpoint or settings.minio_endpoint
        public_secure = (
            settings.minio_public_secure
            if settings.minio_public_endpoint
            else settings.minio_secure
        )
        self._presign_client = self._make_client(public_endpoint, public_secure)
        self._ensure_bucket()

    @staticmethod
    def _make_client(endpoint: str, secure: bool) -> Minio:
        return Minio(
            endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=secure,
        )

    def _ensure_bucket(self):
        """确保存储桶存在。"""
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def upload_bytes(self, data: bytes, content_type: str = 'image/png', object_name: str | None = None) -> str:
        """上传字节数据到 MinIO，返回对象名称。"""
        if object_name is None:
            ext = 'png' if 'png' in content_type else 'jpg'
            object_name = f'products/{uuid.uuid4().hex}.{ext}'
        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return object_name

    def get_presigned_url(self, object_name: str, expires: int = 86400) -> str:
        """生成预签名下载 URL（默认 24 小时），使用公网 endpoint 供浏览器访问。"""
        return self._presign_client.presigned_get_object(
            self.bucket, object_name, expires=timedelta(seconds=expires)
        )

    def get_bytes(self, object_name: str) -> bytes:
        """从 MinIO 读取对象字节。"""
        response = self.client.get_object(self.bucket, object_name)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def resolve_input_image_urls(self, input_data: dict | None, expires: int = 86400) -> list[str]:
        """从任务 input_data 解析输入图 URL，优先 object_names 生成预签名链接。"""
        if not input_data:
            return []
        object_names: list[str] = list(input_data.get('object_names') or [])
        if object_names:
            return [self.get_presigned_url(name, expires=expires) for name in object_names]
        return list(input_data.get('image_urls') or [])

    def resolve_output_data(self, output_data: dict | None, expires: int = 86400) -> dict | None:
        """将 output_data 中的 object_names 解析为可访问的 processed_images URL。"""
        if not output_data:
            return output_data

        result = dict(output_data)
        object_names: list[str] = list(result.get('object_names') or [])

        if not object_names and result.get('processed_images'):
            for item in result['processed_images']:
                if isinstance(item, str) and not item.startswith(('http://', 'https://')):
                    object_names.append(item)

        if object_names:
            result['object_names'] = object_names
            result['processed_images'] = [
                self.get_presigned_url(name, expires=expires) for name in object_names
            ]

        return result

    async def download_and_store(self, url: str, content_type: str = 'image/png') -> str:
        """从外部 URL 下载图片并转存到 MinIO（用于 SeedEdit 24h 临时链接）。"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
        return self.upload_bytes(response.content, content_type)

    def delete(self, object_name: str) -> None:
        """删除对象。"""
        try:
            self.client.remove_object(self.bucket, object_name)
        except S3Error:
            pass


# 全局存储客户端单例
storage = StorageClient()
