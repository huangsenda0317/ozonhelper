/** 俄文注解编辑器 — 会话内文字图层类型（spec §6.2） */

export type TextAlign = "left" | "center" | "right";

export interface AnnotationTextItem {
  id: string;
  /** 俄文主字段 */
  text: string;
  /** 中文草稿，供「从中文翻译填入」 */
  draftZh?: string;
  /** 相对画布宽高的比例 0~1 */
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
}

/** 支持西里尔字母的字体选项 */
export const CYRILLIC_FONT_OPTIONS: { value: string; label: string }[] = [
  { value: '"DejaVu Sans", Arial, sans-serif', label: "DejaVu Sans" },
  { value: 'Arial, "Helvetica Neue", Helvetica, sans-serif', label: "Arial" },
  { value: 'Roboto, "Segoe UI", sans-serif', label: "Roboto" },
];

export const DEFAULT_FONT_FAMILY = CYRILLIC_FONT_OPTIONS[0].value;
export const DEFAULT_FONT_SIZE = 48;
export const DEFAULT_TEXT_COLOR = "#FFFFFF";
export const DEFAULT_ALIGN: TextAlign = "center";

/** Ozon 主图标准尺寸，编辑器与烘烤共用 */
export const ANNOTATION_EXPORT_SIZE = 1200;

export function createAnnotationItem(
  partial?: Partial<AnnotationTextItem>,
): AnnotationTextItem {
  return {
    id: crypto.randomUUID(),
    text: "",
    x: 0.5,
    y: 0.5,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: DEFAULT_FONT_SIZE,
    color: DEFAULT_TEXT_COLOR,
    bold: false,
    italic: false,
    align: DEFAULT_ALIGN,
    ...partial,
  };
}

export function buildFontStyle(item: AnnotationTextItem): string {
  const weight = item.bold ? "bold" : "normal";
  const style = item.italic ? "italic" : "normal";
  return `${style} ${weight} ${item.fontSize}px ${item.fontFamily}`;
}
