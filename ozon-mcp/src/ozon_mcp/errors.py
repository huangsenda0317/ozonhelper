from __future__ import annotations

import json
from dataclasses import asdict, dataclass


@dataclass
class OzonMcpError:
    code: str
    message: str

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


class OzonNotConfiguredError(Exception):
    def __init__(self) -> None:
        super().__init__(
            OzonMcpError(
                code='OZON_NOT_CONFIGURED',
                message='请设置环境变量 OZON_CLIENT_ID 与 OZON_API_KEY',
            ).to_json()
        )


class OzonAuthFailedError(Exception):
    def __init__(self) -> None:
        super().__init__(
            OzonMcpError(
                code='OZON_AUTH_FAILED',
                message='Ozon API 认证失败，请检查 OZON_CLIENT_ID 与 OZON_API_KEY',
            ).to_json()
        )


class OzonRateLimitError(Exception):
    def __init__(self) -> None:
        super().__init__(
            OzonMcpError(
                code='OZON_RATE_LIMIT',
                message='Ozon API 限流（本地 50/s 或远端 429），请稍后重试',
            ).to_json()
        )


class OzonApiError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(OzonMcpError(code='OZON_API_ERROR', message=message).to_json())
