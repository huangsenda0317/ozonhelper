"""图片尺寸标准化工具 — Pillow 缩放/裁剪/白底填充至 Ozon 规范 1200×1200"""

import io

from PIL import Image, ImageOps

OZON_SIZE = (1200, 1200)
SEEDEDIT_MAX_BYTES = 5 * 1024 * 1024
SEEDEDIT_MAX_DIM = 4096


def resize_to_ozon_spec(image_data: bytes, content_type: str = 'image/png') -> bytes:
    """将图片调整为 Ozon 平台规范尺寸 (1200×1200 白底填充/裁剪)。

    策略: 等比缩放 → 居中裁剪/白底填充至 1200×1200。

    Args:
        image_data: 原始图片字节数据
        content_type: 图片 MIME 类型

    Returns:
        处理后的图片字节数据 (PNG 格式)
    """
    img = Image.open(io.BytesIO(image_data))

    # 转换为 RGBA 模式（支持透明通道）
    if img.mode not in ('RGBA', 'RGB'):
        img = img.convert('RGBA')

    # 等比缩放使最短边达到 1200
    ratio = max(OZON_SIZE[0] / img.width, OZON_SIZE[1] / img.height)
    new_size = (int(img.width * ratio), int(img.height * ratio))
    img = img.resize(new_size, Image.LANCZOS)

    # 居中裁剪至 1200×1200
    left = (img.width - OZON_SIZE[0]) // 2
    top = (img.height - OZON_SIZE[1]) // 2
    img = img.crop((left, top, left + OZON_SIZE[0], top + OZON_SIZE[1]))

    # 创建白底画布，将 RGBA 图片粘贴上去（处理透明通道）
    background = Image.new('RGB', OZON_SIZE, (255, 255, 255))
    if img.mode == 'RGBA':
        background.paste(img, (0, 0), img)
    else:
        background.paste(img, (0, 0))

    # 输出为 PNG
    output = io.BytesIO()
    background.save(output, format='PNG', optimize=True)
    return output.getvalue()


def prepare_image_for_seededit(image_data: bytes) -> bytes:
    """将任意图片转为 SeedEdit 兼容的 JPEG（仅支持 JPEG/PNG，≤5MB，边长≤4096）。"""
    img = Image.open(io.BytesIO(image_data))
    img.load()
    img = ImageOps.exif_transpose(img)

    if img.mode == 'RGBA':
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    width, height = img.size
    max_dim = max(width, height)
    if max_dim > SEEDEDIT_MAX_DIM:
        ratio = SEEDEDIT_MAX_DIM / max_dim
        img = img.resize((int(width * ratio), int(height * ratio)), Image.LANCZOS)

    quality = 95
    while quality >= 50:
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=quality, optimize=True)
        data = buf.getvalue()
        if len(data) <= SEEDEDIT_MAX_BYTES:
            return data
        quality -= 10

    width, height = img.size
    img = img.resize((int(width * 0.75), int(height * 0.75)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85, optimize=True)
    data = buf.getvalue()
    if len(data) > SEEDEDIT_MAX_BYTES:
        raise ValueError('图片压缩后仍超过 SeedEdit 5MB 限制')
    return data
