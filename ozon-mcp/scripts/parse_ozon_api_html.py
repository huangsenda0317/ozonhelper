#!/usr/bin/env python3
"""从 Ozon Seller API Redoc HTML 生成 api-index.json。"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML_PATH = ROOT / 'reference' / 'Ozon Seller API 文件.html'
OUTPUT_PATH = Path(__file__).resolve().parents[1] / 'data' / 'api-index.json'


def _strip_html_json(raw: str) -> str:
    text = re.sub(r'<button[^>]*>.*?</button>', '', raw, flags=re.S)
    text = re.sub(r'<[^>]+>', '', text)
    return text.replace('&quot;', '"').replace('&#34;', '"').replace('&lt;', '<').replace('&gt;', '>').strip()


def _parse_request_example(block: str) -> dict | list | str | None:
    idx = block.find('请求范例')
    if idx < 0:
        return None
    sub = block[idx : idx + 25000]
    match = re.search(r'<div class="redoc-json"><code>(.*?)</code></div>', sub, re.S)
    if not match:
        return None
    raw = _strip_html_json(match.group(1))
    if not raw.startswith(('{', '[')):
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw[:2000]


def _parse_request_fields(block: str) -> list[dict]:
    idx = block.find('Request Body schema')
    if idx < 0:
        return []
    end = block.find('Response Schema', idx)
    if end < 0:
        end = idx + 50000
    sub = block[idx:end]
    fields: list[dict] = []
    seen: set[str] = set()
    for match in re.finditer(r'kind="field"[^>]*title="([^"]+)"', sub):
        name = match.group(1)
        if name in seen:
            continue
        seen.add(name)
        chunk = sub[match.start() : match.start() + 800]
        required = 'required' in chunk and 'sc-jUotMc' in chunk
        type_match = re.search(r'gKOKkl fSXOaG">([^<]+)</span>', chunk)
        field_type = type_match.group(1).strip() if type_match else 'unknown'
        fields.append({'name': name, 'type': field_type, 'required': required})
    return fields


def parse_html(html: str) -> list[dict]:
    parts = re.split(r'data-section-id="operation/([^"]+)"', html)
    entries: dict[str, dict] = {}
    for i in range(1, len(parts), 2):
        op_id = parts[i]
        block = parts[i + 1][:120000]
        method_match = re.search(r'http-verb (post|get)', block, re.I)
        path_match = re.search(r'>(/v[\d]/[^<]+)</div', block)
        title_match = re.search(r'<h2[^>]*>.*?<a[^>]*></a>\s*([^<]+?)\s*</h2>', block, re.S)
        if not path_match:
            continue
        path = path_match.group(1).strip()
        entries[path] = {
            'operation_id': op_id,
            'path': path,
            'method': (method_match.group(1) if method_match else 'post').upper(),
            'title': (title_match.group(1).strip() if title_match else op_id),
            'request_fields': _parse_request_fields(block),
            'request_example': _parse_request_example(block),
        }
    return sorted(entries.values(), key=lambda x: x['path'])


def main() -> None:
    html_path = Path(sys.argv[1]) if len(sys.argv) > 1 else HTML_PATH
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT_PATH
    if not html_path.exists():
        print(f'HTML not found: {html_path}', file=sys.stderr)
        sys.exit(1)
    html = html_path.read_text(encoding='utf-8')
    index = parse_html(html)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {len(index)} endpoints to {out_path}')


if __name__ == '__main__':
    main()
