from __future__ import annotations

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_REFERENCE = _REPO_ROOT / 'reference'


def _read_reference(name: str) -> str:
    path = _REFERENCE / name
    if path.exists():
        return path.read_text(encoding='utf-8')
    return f'参考文档未找到: {name}'


def _extract_endpoints_markdown() -> str:
    content = _read_reference('Ozon_Seller_API_AI_阅读版.md')
    start = content.find('## 5. 按模块分类接口详情')
    end = content.find('## 6. 核心业务流程')
    if start >= 0 and end > start:
        return content[start:end].strip()
    return content


def _extract_workflows_markdown() -> str:
    content = _read_reference('Ozon_Seller_API_AI_阅读版.md')
    start = content.find('## 6. 核心业务流程')
    end = content.find('## 7. 限流与错误处理')
    if start >= 0 and end > start:
        return content[start:end].strip()
    return content


def get_overview_resource() -> str:
    return _read_reference('Ozon_Seller_API_精简架构文档.md')


def get_endpoints_resource() -> str:
    return _extract_endpoints_markdown()


def get_workflows_resource() -> str:
    return _extract_workflows_markdown()


RESOURCE_URIS = {
    'ozon://api/overview': get_overview_resource,
    'ozon://api/endpoints': get_endpoints_resource,
    'ozon://api/workflows': get_workflows_resource,
}


def list_resource_uris() -> list[str]:
    return list(RESOURCE_URIS.keys())


def read_resource(uri: str) -> str:
    factory = RESOURCE_URIS.get(uri)
    if factory is None:
        if uri.startswith('ozon://api/schema/'):
            path = uri.removeprefix('ozon://api/schema')
            return f'请使用 get_endpoint_schema 工具查询 path={path}'
        raise ValueError(f'未知 resource: {uri}')
    return factory()
