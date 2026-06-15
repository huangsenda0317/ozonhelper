from __future__ import annotations

import json
from functools import lru_cache
from importlib import resources
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_index_file() -> list[dict[str, Any]]:
    pkg_root = Path(__file__).resolve().parents[2]  # ozon-mcp/
    module_data = Path(__file__).resolve().parent / 'data' / 'api-index.json'
    candidates = [
        module_data,
        pkg_root / 'data' / 'api-index.json',
        _REPO_ROOT / 'ozon-mcp' / 'data' / 'api-index.json',
    ]
    for path in candidates:
        if path.exists():
            return json.loads(path.read_text(encoding='utf-8'))
    try:
        raw = resources.files('ozon_mcp').joinpath('data/api-index.json').read_text(encoding='utf-8')
        return json.loads(raw)
    except (FileNotFoundError, ModuleNotFoundError):
        return []


@lru_cache(maxsize=1)
def get_api_index() -> list[dict[str, Any]]:
    return _load_index_file()


@lru_cache(maxsize=1)
def get_index_by_path() -> dict[str, dict[str, Any]]:
    return {entry['path']: entry for entry in get_api_index()}


def get_endpoint_schema(path: str) -> dict[str, Any] | None:
    normalized = path if path.startswith('/') else f'/{path}'
    return get_index_by_path().get(normalized)


def search_endpoints(query: str, limit: int = 20) -> list[dict[str, Any]]:
    q = query.strip().lower()
    if not q:
        return []
    results: list[dict[str, Any]] = []
    for entry in get_api_index():
        haystack = f"{entry.get('path', '')} {entry.get('title', '')} {entry.get('operation_id', '')}".lower()
        if q in haystack:
            results.append(
                {
                    'path': entry['path'],
                    'method': entry['method'],
                    'title': entry['title'],
                    'operation_id': entry['operation_id'],
                }
            )
        if len(results) >= limit:
            break
    return results
