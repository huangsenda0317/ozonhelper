import {
  ANNOTATION_EXPORT_SIZE,
  type AnnotationTextItem,
  buildFontStyle,
  normalizeAnnotationText,
} from "./annotationTypes";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("底图加载失败"));
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas 导出失败"));
      },
      type,
      quality,
    );
  });
}

/**
 * 将底图与文字图层烘烤为扁平 JPEG。
 * @param baseImageUrl AI 底图 URL
 * @param items 文字列表（仅绘制 text 非空的项）
 * @param exportSize 输出边长，默认 1200（Ozon 规范）
 */
export async function bakeAnnotationToBlob(
  baseImageUrl: string,
  items: AnnotationTextItem[],
  exportSize = ANNOTATION_EXPORT_SIZE,
): Promise<Blob> {
  const img = await loadImage(baseImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");

  ctx.drawImage(img, 0, 0, exportSize, exportSize);

  const drawable = items.filter(
    (item) => normalizeAnnotationText(item.text).length > 0,
  );
  for (const item of drawable) {
    const text = normalizeAnnotationText(item.text);
    ctx.save();
    ctx.font = buildFontStyle(item);
    ctx.fillStyle = item.color;
    ctx.textAlign = item.align;
    ctx.textBaseline = "middle";

    const x = item.x * exportSize;
    const y = item.y * exportSize;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  return canvasToBlob(canvas, "image/jpeg", 0.92);
}
