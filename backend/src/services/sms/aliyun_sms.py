"""阿里云号码认证 — 短信验证码发送与核验"""

import json
import logging

from alibabacloud_dypnsapi20170525 import models as dypns_models
from alibabacloud_dypnsapi20170525.client import Client as DypnsClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_tea_util import models as util_models

from src.config import Settings, get_settings

logger = logging.getLogger(__name__)


class SmsNotConfiguredError(Exception):
    """阿里云 AccessKey 未配置。"""


class SmsRateLimitError(Exception):
    """发送过于频繁。"""


class SmsSendFailedError(Exception):
    """短信发送失败。"""


class AliyunSmsService:
    """封装 Dypnsapi SendSmsVerifyCode / CheckSmsVerifyCode。"""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def _ensure_configured(self) -> None:
        if not self.settings.aliyun_access_key_id or not self.settings.aliyun_access_key_secret:
            raise SmsNotConfiguredError()

    def _create_client(self) -> DypnsClient:
        self._ensure_configured()
        config = open_api_models.Config(
            access_key_id=self.settings.aliyun_access_key_id,
            access_key_secret=self.settings.aliyun_access_key_secret,
        )
        config.endpoint = 'dypnsapi.aliyuncs.com'
        return DypnsClient(config)

    def send_verify_code(self, phone: str) -> None:
        """向手机号发送验证码。"""
        client = self._create_client()
        valid_minutes = max(1, self.settings.aliyun_sms_valid_time // 60)
        request = dypns_models.SendSmsVerifyCodeRequest(
            phone_number=phone,
            sign_name=self.settings.aliyun_sms_sign_name,
            template_code=self.settings.aliyun_sms_template_code,
            scheme_name=self.settings.aliyun_sms_scheme_name,
            template_param=json.dumps({'code': '##code##', 'min': str(valid_minutes)}, ensure_ascii=False),
            code_length=self.settings.aliyun_sms_code_length,
            valid_time=self.settings.aliyun_sms_valid_time,
            interval=self.settings.aliyun_sms_interval,
            code_type=1,
            return_verify_code=False,
        )
        runtime = util_models.RuntimeOptions()
        try:
            response = client.send_sms_verify_code_with_options(request, runtime)
        except Exception as exc:
            message = str(exc)
            logger.error('SendSmsVerifyCode failed for phone=%s***: %s', phone[:3], message)
            if _is_rate_limit_error(message):
                raise SmsRateLimitError(message) from exc
            raise SmsSendFailedError(message) from exc

        body = response.body
        request_id = getattr(body, 'request_id', None) or getattr(body, 'RequestId', None)
        code = getattr(body, 'code', None) or getattr(body, 'Code', None)
        if code != 'OK':
            message = getattr(body, 'message', None) or getattr(body, 'Message', '') or '发送失败'
            logger.error(
                'SendSmsVerifyCode rejected phone=%s*** request_id=%s code=%s message=%s',
                phone[:3],
                request_id,
                code,
                message,
            )
            if _is_rate_limit_error(message) or _is_rate_limit_code(code):
                raise SmsRateLimitError(message)
            raise SmsSendFailedError(message)

        logger.info('SendSmsVerifyCode ok phone=%s*** request_id=%s', phone[:3], request_id)

    def check_verify_code(self, phone: str, code: str) -> bool:
        """核验验证码，返回是否通过。"""
        client = self._create_client()
        request = dypns_models.CheckSmsVerifyCodeRequest(
            phone_number=phone,
            verify_code=code,
            scheme_name=self.settings.aliyun_sms_scheme_name,
            case_auth_policy=1,
        )
        runtime = util_models.RuntimeOptions()
        try:
            response = client.check_sms_verify_code_with_options(request, runtime)
        except Exception as exc:
            message = str(exc)
            logger.error('CheckSmsVerifyCode failed phone=%s*** request_id=unknown: %s', phone[:3], message)
            return False

        body = response.body
        request_id = getattr(body, 'request_id', None) or getattr(body, 'RequestId', None)
        api_code = getattr(body, 'code', None) or getattr(body, 'Code', None)
        if api_code != 'OK':
            message = getattr(body, 'message', None) or getattr(body, 'Message', '') or '核验失败'
            logger.warning(
                'CheckSmsVerifyCode rejected phone=%s*** request_id=%s code=%s message=%s',
                phone[:3],
                request_id,
                api_code,
                message,
            )
            return False

        model = getattr(body, 'model', None) or getattr(body, 'Model', None)
        verify_result = None
        if model is not None:
            verify_result = getattr(model, 'verify_result', None) or getattr(model, 'VerifyResult', None)
        passed = verify_result == 'PASS'
        logger.info(
            'CheckSmsVerifyCode phone=%s*** request_id=%s result=%s',
            phone[:3],
            request_id,
            verify_result,
        )
        return passed


def _is_rate_limit_error(message: str) -> bool:
    lowered = message.lower()
    return '频繁' in message or 'limit' in lowered or 'throttl' in lowered


def _is_rate_limit_code(code: str | None) -> bool:
    if not code:
        return False
    return code in {'isv.BUSINESS_LIMIT_CONTROL', 'Throttling', 'Throttling.User'}
