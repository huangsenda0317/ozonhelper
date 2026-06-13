"""腾讯云 TMT 翻译客户端 — TextTranslate 接口、API 3.0 签名、分段翻译"""

import json
import time

import httpx
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.tmt.v20180321 import tmt_client, models

from src.config import get_settings

settings = get_settings()


class TMTTranslator:
    """腾讯云机器翻译（TMT）客户端。"""

    MAX_TEXT_LENGTH = 6000  # 单次最大字符数
    MAX_RPS = 5  # 每秒最大请求数

    def __init__(self):
        cred = credential.Credential(settings.tencent_secret_id, settings.tencent_secret_key)
        self.client = tmt_client.TmtClient(cred, settings.tencent_tmt_region)
        self._last_request_time = 0

    def translate(
        self,
        source_text: str,
        source_lang: str = 'zh',
        target_lang: str = 'ru',
        untranslated_text: str | None = None,
    ) -> dict:
        """翻译文本（自动分段处理超长文本）。

        Args:
            source_text: 待翻译文本 (UTF-8)
            source_lang: 源语言代码
            target_lang: 目标语言代码
            untranslated_text: 不希望翻译的标记文本

        Returns:
            {'target_text': str, 'source': str, 'target': str, 'used_amount': int}
        """
        # 自动分段（超 6000 字符）
        segments = self._split_text(source_text)
        results = []

        for segment in segments:
            results.append(self._call_api(segment, source_lang, target_lang, untranslated_text))

        # 合并结果
        merged_text = ''.join(r['target_text'] for r in results)
        total_used = sum(r['used_amount'] for r in results)

        return {
            'target_text': merged_text,
            'source': source_lang,
            'target': target_lang,
            'used_amount': total_used,
        }

    def _call_api(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        untranslated_text: str | None = None,
    ) -> dict:
        """调用 TMT TextTranslate API（含频率限制节流）。"""
        # 频率限制: 5 次/秒
        elapsed = time.time() - self._last_request_time
        if elapsed < 1.0 / self.MAX_RPS:
            time.sleep(1.0 / self.MAX_RPS - elapsed)

        self._last_request_time = time.time()

        try:
            req = models.TextTranslateRequest()
            req.SourceText = text
            req.Source = source_lang
            req.Target = target_lang
            req.ProjectId = settings.tencent_tmt_project_id
            if untranslated_text:
                req.UntranslatedText = untranslated_text

            resp = self.client.TextTranslate(req)

            return {
                'target_text': resp.TargetText,
                'source': resp.Source,
                'target': resp.Target,
                'used_amount': resp.UsedAmount,
            }
        except TencentCloudSDKException as e:
            raise TMTError(code=e.code, message=e.message) from e

    def _split_text(self, text: str) -> list[str]:
        """将超长文本分段（按句子边界切割，确保每段 ≤ 6000 字符）。"""
        if len(text) <= self.MAX_TEXT_LENGTH:
            return [text]

        segments = []
        current = ''
        # 按句号、换行等自然边界分割
        for char in text:
            current += char
            if len(current) >= self.MAX_TEXT_LENGTH - 100 and char in '。！？\n.!?':
                segments.append(current)
                current = ''
        if current:
            segments.append(current)
        return segments


class TMTError(Exception):
    """TMT API 错误。"""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f'TMT Error [{code}]: {message}')


# 全局单例
tmt_translator = TMTTranslator()
