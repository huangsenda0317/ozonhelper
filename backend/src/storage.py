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
        public_endpoint, public_secure = self._resolve_public_endpoint()
        self._presign_client = self._make_client(public_endpoint, public_secure)
        self._ensure_bucket()

    def _resolve_public_endpoint(self) -> tuple[str, bool]:
        """development 强制本地 endpoint；其余环境有公网域名则用公网。"""
        if settings.app_env == 'development':
            return settings.minio_endpoint, settings.minio_secure
        if settings.minio_public_endpoint:
            return settings.minio_public_endpoint, settings.minio_public_secure
        return settings.minio_endpoint, settings.minio_secure

    @staticmethod
    def _make_client(endpoint: str, secure: bool) -> Minio:
        # 固定 region，避免公网 endpoint 经 Nginx 反代时 region 探测触发 SignatureDoesNotMatch
        return Minio(
            endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=secure,
            region='us-east-1',
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
        """生成预签名下载 URL（默认 24 小时）。"""
        return self._presign_client.presigned_get_object(
            self.bucket, object_name, expires=timedelta(seconds=expires)
        )

    def _extract_object_name(self, value: str) -> str | None:
        """从 object_name 或历史预签名 URL 中提取 MinIO 对象路径。"""
        if not value.startswith(('http://', 'https://')):
            return value
        marker = f'/{self.bucket}/'
        if marker not in value:
            return None
        return value.split(marker, 1)[1].split('?', 1)[0]

    def _refresh_presigned_url(self, value: str, expires: int = 86400) -> str:
        """将历史预签名 URL 按当前环境重新签名（开发/生产切换时避免旧域名）。"""
        object_name = self._extract_object_name(value)
        if object_name:
            return self.get_presigned_url(object_name, expires=expires)
        return value

    def get_bytes(self, object_name: str) -> bytes:
        """从 MinIO 读取对象字节。"""
        response = self.client.get_object(self.bucket, object_name)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def resolve_input_image_urls(self, input_data: dict | None, expires: int = 86400) -> list[str]:
        """从任务 input_data 解析输入图 URL，优先 object_names 生成预签名链接。

        兼容自由改图的 image_urls/object_names，以及工作流的 images[{url, object_name}]。
        """
        if not input_data:
            return []
        object_names: list[str] = list(input_data.get('object_names') or [])
        if not object_names:
            for item in input_data.get('images') or []:
                if not isinstance(item, dict):
                    continue
                name = item.get('object_name')
                if isinstance(name, str) and name:
                    object_names.append(name)
        if object_names:
            return [self.get_presigned_url(name, expires=expires) for name in object_names]

        stored_urls = list(input_data.get('image_urls') or [])
        if not stored_urls:
            for item in input_data.get('images') or []:
                if not isinstance(item, dict):
                    continue
                url = item.get('url')
                if isinstance(url, str) and url:
                    stored_urls.append(url)
        return [self._refresh_presigned_url(url, expires=expires) for url in stored_urls]

    def resolve_output_data(self, output_data: dict | None, expires: int = 86400) -> dict | None:
        """将 output_data 中的对象名解析为可访问 URL（processed_images / final / ai_base）。"""
        if not output_data:
            return output_data

        result = dict(output_data)
        object_names: list[str] = list(result.get('object_names') or [])

        if not object_names and result.get('processed_images'):
            for item in result['processed_images']:
                if not isinstance(item, str):
                    continue
                extracted = self._extract_object_name(item)
                if extracted:
                    object_names.append(extracted)

        base_urls: list[str] = []
        if object_names:
            result['object_names'] = object_names
            base_urls = [
                self.get_presigned_url(name, expires=expires) for name in object_names
            ]
            result['ai_base_image_url'] = base_urls[-1]
        elif result.get('ai_base_image_url'):
            result['ai_base_image_url'] = self._refresh_presigned_url(
                result['ai_base_image_url'], expires=expires
            )

        final_obj = result.get('final_object_name')
        if isinstance(final_obj, str) and final_obj:
            result['final_image_url'] = self.get_presigned_url(final_obj, expires=expires)
        elif result.get('final_image_url'):
            result['final_image_url'] = self._refresh_presigned_url(
                result['final_image_url'], expires=expires
            )

        if result.get('final_image_url'):
            result['processed_images'] = [result['final_image_url']]
        elif base_urls:
            result['processed_images'] = base_urls
        elif result.get('ai_base_image_url'):
            result['processed_images'] = [result['ai_base_image_url']]

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
