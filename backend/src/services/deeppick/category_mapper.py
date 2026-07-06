"""DeepPick 类目选项 → 级联树结构。"""

from __future__ import annotations

from typing import Any

from src.schemas.deeppick_rankings import CategoryOptionNode

PATH_SEP = ' / '


def build_category_tree(items: list[dict[str, Any]]) -> list[CategoryOptionNode]:
    """将扁平类目列表转为三级级联树（一级 → 二级 → 叶子 type_id）。"""
    # l1 -> l2 -> type_id -> node data
    tree: dict[str, dict[str, dict[str, dict[str, Any]]]] = {}

    for item in items:
        path_zh = (item.get('path_zh') or item.get('label') or '').strip()
        if not path_zh:
            continue

        parts = [p.strip() for p in path_zh.split(PATH_SEP) if p.strip()]
        if len(parts) < 3:
            continue

        l1, l2, l3 = parts[0], parts[1], parts[2]
        type_id = str(item.get('value') or '')
        if not type_id:
            continue

        tree.setdefault(l1, {}).setdefault(l2, {})[type_id] = {
            'label': l3,
            'path_zh': path_zh,
            'type_id': type_id,
            'description_category_id': item.get('description_category_id'),
        }

    result: list[CategoryOptionNode] = []
    for l1 in sorted(tree.keys()):
        l2_map = tree[l1]
        l2_nodes: list[CategoryOptionNode] = []
        for l2 in sorted(l2_map.keys()):
            leaves = l2_map[l2]
            leaf_nodes = [
                CategoryOptionNode(
                    value=meta['type_id'],
                    label=meta['label'],
                    path_zh=meta['path_zh'],
                    is_leaf=True,
                )
                for _, meta in sorted(leaves.items(), key=lambda x: x[1]['label'])
            ]
            l2_nodes.append(
                CategoryOptionNode(
                    value=f'cat2:{l1}:{l2}',
                    label=l2,
                    is_leaf=False,
                    children=leaf_nodes,
                )
            )
        result.append(
            CategoryOptionNode(
                value=f'cat1:{l1}',
                label=l1,
                is_leaf=False,
                children=l2_nodes,
            )
        )

    return result
