from __future__ import annotations

STEP_PROMPT_FRAGMENTS: dict[str, str] = {
    'remove_watermark': '去除图片中的所有中文水印和文字',
    'cutout': '抠出商品主体，去除杂乱背景，保留主体完整清晰',
    'add_scene': '为商品配置适合 Ozon 电商主图的展示场景或干净白底，主体居中、光线自然',
}

DEFAULT_SCENE_PROMPT = STEP_PROMPT_FRAGMENTS['add_scene']


def fragment_for(step_id: str, custom_prompt: str = '') -> str:
    if step_id == 'add_scene' and custom_prompt.strip():
        return custom_prompt.strip()
    return STEP_PROMPT_FRAGMENTS[step_id]
