"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Languages,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { message } from "antd";

import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AITask } from "@/components/features/AITaskList";

import { bakeAnnotationToBlob } from "./bakeAnnotation";
import {
  ANNOTATION_EXPORT_SIZE,
  type AnnotationTextItem,
  type TextAlign,
  CYRILLIC_FONT_OPTIONS,
  createAnnotationItem,
  buildFontStyle,
  getPreviewAnchorTransform,
  normalizeAnnotationText,
} from "./annotationTypes";

interface TextLayoutSuggestion {
  id: string;
  x: number;
  y: number;
  fontSize?: number;
  align?: TextAlign;
}

interface SuggestTextLayoutResponse {
  suggestions: TextLayoutSuggestion[];
}

interface TranslateTextResult {
  target_text: string;
}

interface UploadImageResult {
  object_name: string;
  url: string;
}

export interface AnnotationEditorProps {
  task: AITask;
  onComplete: () => void;
  onClose: () => void;
}

export function AnnotationEditor({
  task,
  onComplete,
  onClose,
}: AnnotationEditorProps) {
  const baseImageUrl = task.output_data?.ai_base_image_url;
  const baseObjectName = task.output_data?.object_names?.at(-1) ?? undefined;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<AnnotationTextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const autoLayoutRan = useRef(false);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const scale = canvasWidth > 0 ? canvasWidth / ANNOTATION_EXPORT_SIZE : 1;

  const updateItem = useCallback(
    (id: string, patch: Partial<AnnotationTextItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const applySuggestions = useCallback(
    (suggestions: TextLayoutSuggestion[]) => {
      setItems((prev) =>
        prev.map((item) => {
          const sug = suggestions.find((s) => s.id === item.id);
          if (!sug) return item;
          return {
            ...item,
            x: sug.x,
            y: sug.y,
            ...(sug.fontSize != null ? { fontSize: sug.fontSize } : {}),
            ...(sug.align ? { align: sug.align } : {}),
          };
        }),
      );
    },
    [],
  );

  const runSuggestLayout = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!baseImageUrl) return;
      const textItems = items.filter((i) => i.text.trim());
      if (textItems.length === 0) {
        if (!options?.silent) {
          message.info("请先添加并填写俄文文案");
        }
        return;
      }

      setLayoutLoading(true);
      try {
        const response = await apiClient.post<SuggestTextLayoutResponse>(
          "/ai/workflow/suggest-text-layout",
          {
            image_url: baseImageUrl,
            object_name: baseObjectName,
            items: textItems.map((i) => ({ id: i.id, text: i.text })),
          },
        );
        if (response.success && response.data?.suggestions) {
          applySuggestions(response.data.suggestions);
          if (!options?.silent) {
            message.success("AI 定位已更新");
          }
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "AI 定位失败，请手动拖拽文字位置";
        message.warning(msg);
      } finally {
        setLayoutLoading(false);
      }
    },
    [applySuggestions, baseImageUrl, baseObjectName, items],
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setCanvasWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (autoLayoutRan.current) return;
    const textItems = items.filter((i) => i.text.trim());
    if (textItems.length === 0) return;
    autoLayoutRan.current = true;
    void runSuggestLayout({ silent: true });
  }, [items, runSuggestLayout]);

  const handleAddItem = () => {
    const item = createAnnotationItem({ y: 0.3 + items.length * 0.1 });
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleTranslate = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item?.draftZh?.trim()) {
      message.warning("请先填写中文草稿");
      return;
    }

    setTranslatingId(id);
    try {
      const response = await apiClient.post<TranslateTextResult>(
        "/ai/translate-text",
        {
          source_text: item.draftZh.trim(),
          source_lang: "zh",
          target_lang: "ru",
        },
      );
      if (response.success && response.data) {
        updateItem(id, { text: response.data.target_text });
        message.success("已填入俄文译文");
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "翻译失败，请稍后重试";
      message.error(msg);
    } finally {
      setTranslatingId(null);
    }
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(id);
    setSelectedId(id);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    updateItem(draggingId, { x, y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggingId(null);
    }
  };

  const handleExport = async () => {
    if (!baseImageUrl) {
      message.error("缺少 AI 底图，无法完成注解");
      return;
    }

    setExporting(true);
    try {
      if (items.length === 0) {
        const response = await apiClient.post(
          `/ai/workflow/${task.id}/complete-annotation`,
          { skip: true },
        );
        if (response.success) {
          message.success("已跳过注解，任务完成");
          onComplete();
        }
        return;
      }

      const blob = await bakeAnnotationToBlob(baseImageUrl, items);
      const file = new File([blob], `annotation-${task.id}.jpg`, {
        type: "image/jpeg",
      });
      const uploadRes = await apiClient.upload<UploadImageResult>(
        "/ai/upload-image",
        file,
      );
      if (!uploadRes.success || !uploadRes.data) {
        throw new Error("烘烤图上传失败");
      }

      const completeRes = await apiClient.post(
        `/ai/workflow/${task.id}/complete-annotation`,
        {
          image_url: uploadRes.data.url,
          object_name: uploadRes.data.object_name,
        },
      );
      if (completeRes.success) {
        message.success("注解已完成");
        onComplete();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "导出失败，请稍后重试";
      message.error(msg);
    } finally {
      setExporting(false);
    }
  };

  if (!baseImageUrl) {
    return (
      <Card variant="default" padding="lg" className="w-full max-w-md">
        <p className="text-caption text-muted mb-lg">
          该任务缺少 AI 底图，无法进入注解编辑器。
        </p>
        <Button variant="primary" onClick={onClose} className="w-full">
          关闭
        </Button>
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      padding="md"
      className="w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-sm mb-md shrink-0">
        <div>
          <h2 className="text-heading-sm font-display text-ink">
            俄文注解编辑器
          </h2>
          <p className="text-caption text-muted mt-xxs">
            拖拽定位文字，支持 AI 自动布局与中译俄
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-xs rounded-md interactive-muted-soft cursor-pointer"
          aria-label="关闭编辑器"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-md flex-1 min-h-0 overflow-hidden">
        {/* 左：画布 */}
        <div className="flex flex-col min-h-0">
          <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-xs">
            画布预览
          </p>
          <div
            ref={canvasRef}
            className="relative aspect-square w-full bg-surface-elevated rounded-md overflow-hidden border border-hairline select-none touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={baseImageUrl}
              alt="AI 底图"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const displaySize = item.fontSize * scale;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`absolute cursor-grab active:cursor-grabbing px-xxs py-px rounded-xs transition-shadow duration-200 ${
                    isSelected
                      ? "ring-2 ring-accent-violet-mid shadow-md"
                      : "hover:ring-1 hover:ring-hairline"
                  }`}
                  style={{
                    left: `${item.x * 100}%`,
                    top: `${item.y * 100}%`,
                    transform: getPreviewAnchorTransform(item.align),
                    font: buildFontStyle({
                      ...item,
                      fontSize: displaySize,
                    }),
                    color: item.color,
                    textAlign: item.align,
                    whiteSpace: "nowrap",
                  }}
                  onPointerDown={(e) => handlePointerDown(e, item.id)}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedId(item.id);
                    }
                  }}
                >
                  {normalizeAnnotationText(item.text) || (
                    <span className="opacity-50 text-caption">（空文案）</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-xs mt-sm">
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => void runSuggestLayout()}
              loading={layoutLoading}
              disabled={items.length === 0}
              className="gap-xs normal-case"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              重新 AI 定位
            </Button> */}
          </div>
        </div>

        {/* 右：紧凑文字列表（渐进披露） */}
        <div className="flex flex-col min-h-0">
          <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-xs shrink-0">
            文字列表 · {items.length}
          </p>

          <div className="flex-1 min-h-0 overflow-y-auto pr-xxs">
            {items.length === 0 ? (
              <p className="text-caption text-muted py-md px-sm text-center border border-dashed border-hairline rounded-md">
                暂无文案。可直接导出跳过，或点下方添加。
              </p>
            ) : (
              <ul className="flex flex-col gap-xs list-none m-0 p-0">
                {items.map((item, index) => {
                  const isSelected = item.id === selectedId;
                  const preview =
                    normalizeAnnotationText(item.text) || "（空文案）";
                  const ruId = `anno-ru-${item.id}`;
                  const zhId = `anno-zh-${item.id}`;

                  return (
                    <li key={item.id}>
                      <div
                        className={`rounded-md border transition-colors duration-200 ${
                          isSelected
                            ? "border-accent-violet-mid bg-surface-elevated"
                            : "border-hairline hover:border-hairline-violet bg-surface-card"
                        }`}
                      >
                        {/* 摘要行：始终显示 */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="flex items-center gap-xs px-sm py-xs cursor-pointer min-h-[36px]"
                          onClick={() => setSelectedId(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedId(item.id);
                            }
                          }}
                          aria-expanded={isSelected}
                          aria-controls={`anno-detail-${item.id}`}
                        >
                          <span className="text-micro-cap text-muted tabular-nums w-5 shrink-0">
                            {index + 1}
                          </span>
                          <span
                            className="flex-1 min-w-0 text-caption text-ink truncate"
                            title={preview}
                          >
                            {preview}
                          </span>
                          <span
                            className="h-3 w-3 rounded-full border border-hairline shrink-0"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            className="p-xxs rounded interactive-muted-soft text-muted hover:text-accent-pink cursor-pointer shrink-0"
                            aria-label={`删除文案 ${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* 详情：仅选中展开 */}
                        {isSelected && (
                          <div
                            id={`anno-detail-${item.id}`}
                            className="px-sm pb-sm pt-xxs space-y-xs border-t border-hairline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <label
                                htmlFor={ruId}
                                className="block text-micro-cap text-muted mb-px"
                              >
                                俄文
                              </label>
                              <input
                                id={ruId}
                                type="text"
                                value={item.text}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    text: normalizeAnnotationText(
                                      e.target.value,
                                    ),
                                  })
                                }
                                className="w-full text-caption rounded-md border border-hairline bg-surface-card px-sm py-xxs h-8 focus:outline-none focus:ring-2 focus:ring-accent-violet-mid/40"
                                placeholder="俄文商品文案"
                              />
                            </div>

                            <div className="flex items-end gap-xs">
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={zhId}
                                  className="block text-micro-cap text-muted mb-px"
                                >
                                  中文草稿
                                </label>
                                <input
                                  id={zhId}
                                  type="text"
                                  value={item.draftZh ?? ""}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      draftZh: e.target.value,
                                    })
                                  }
                                  className="w-full text-caption rounded-md border border-hairline bg-surface-card px-sm py-xxs h-8 focus:outline-none focus:ring-2 focus:ring-accent-violet-mid/40"
                                  placeholder="中文 → 翻译"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => void handleTranslate(item.id)}
                                loading={translatingId === item.id}
                                disabled={!item.draftZh?.trim()}
                                className="shrink-0 gap-xxs normal-case h-8 px-sm"
                                title="从中文翻译填入"
                                aria-label="从中文翻译填入"
                              >
                                <Languages
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>

                            <div
                              className="flex flex-wrap items-center gap-xs pt-xs"
                              role="toolbar"
                              aria-label="文字样式"
                            >
                              <select
                                value={item.fontFamily}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    fontFamily: e.target.value,
                                  })
                                }
                                className="h-8 min-w-[6.5rem] flex-1 text-caption rounded-md border border-hairline bg-surface-card px-sm leading-none focus:outline-none focus:ring-2 focus:ring-accent-violet-mid/40"
                                aria-label="字体"
                              >
                                {CYRILLIC_FONT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>

                              <div className="inline-flex h-8 items-center gap-xs rounded-md border border-hairline bg-surface-card px-sm shrink-0">
                                <span
                                  className="text-micro-cap text-muted tabular-nums w-6 text-center"
                                  aria-hidden="true"
                                >
                                  {item.fontSize}
                                </span>
                                <input
                                  type="range"
                                  min={16}
                                  max={120}
                                  value={item.fontSize}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      fontSize: parseInt(e.target.value, 10),
                                    })
                                  }
                                  className="w-20 h-8 accent-primary cursor-pointer"
                                  aria-label={`字号 ${item.fontSize}`}
                                />
                              </div>

                              <label className="relative inline-flex h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-hairline bg-surface-card">
                                <span className="sr-only">颜色</span>
                                <input
                                  type="color"
                                  value={item.color}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      color: e.target.value,
                                    })
                                  }
                                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                  aria-label="文字颜色"
                                />
                                <span
                                  className="pointer-events-none m-auto h-4 w-4 rounded-full border border-hairline"
                                  style={{ backgroundColor: item.color }}
                                  aria-hidden="true"
                                />
                              </label>

                              <div className="inline-flex h-8 items-stretch rounded-md border border-hairline overflow-hidden shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItem(item.id, { bold: !item.bold })
                                  }
                                  className={`inline-flex h-8 w-8 items-center justify-center text-caption font-bold cursor-pointer transition-colors duration-200 ${
                                    item.bold
                                      ? "bg-accent-violet-mid/15 text-ink"
                                      : "bg-surface-card text-muted hover:bg-surface-elevated"
                                  }`}
                                  aria-pressed={item.bold}
                                  aria-label="粗体"
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItem(item.id, {
                                      italic: !item.italic,
                                    })
                                  }
                                  className={`inline-flex h-8 w-8 items-center justify-center text-caption italic border-l border-hairline cursor-pointer transition-colors duration-200 ${
                                    item.italic
                                      ? "bg-accent-violet-mid/15 text-ink"
                                      : "bg-surface-card text-muted hover:bg-surface-elevated"
                                  }`}
                                  aria-pressed={item.italic}
                                  aria-label="斜体"
                                >
                                  I
                                </button>
                              </div>

                              <div className="inline-flex h-8 items-stretch rounded-md border border-hairline overflow-hidden shrink-0 ml-auto">
                                {(
                                  [
                                    {
                                      value: "left" as const,
                                      icon: AlignLeft,
                                    },
                                    {
                                      value: "center" as const,
                                      icon: AlignCenter,
                                    },
                                    {
                                      value: "right" as const,
                                      icon: AlignRight,
                                    },
                                  ] as const
                                ).map(({ value, icon: Icon }, idx) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                      updateItem(item.id, { align: value })
                                    }
                                    className={`inline-flex h-8 w-8 items-center justify-center cursor-pointer transition-colors duration-200 ${
                                      idx > 0 ? "border-l border-hairline" : ""
                                    } ${
                                      item.align === value
                                        ? "bg-accent-violet-mid/15 text-ink"
                                        : "bg-surface-card text-muted hover:bg-surface-elevated"
                                    }`}
                                    aria-pressed={item.align === value}
                                    aria-label={`${value} 对齐`}
                                  >
                                    <Icon
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="shrink-0 pt-sm mt-sm border-t border-hairline">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddItem}
              className="w-full gap-xs normal-case"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              添加文案
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-sm pt-md mt-md border-t border-hairline shrink-0">
        <Button
          variant="primary"
          onClick={() => void handleExport()}
          loading={exporting}
          className="gap-sm"
        >
          导出并完成
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={exporting}>
          取消
        </Button>
        {items.length === 0 && (
          <span className="text-caption text-muted self-center">
            0 条文案将跳过注解，直接使用 AI 底图
          </span>
        )}
      </div>
    </Card>
  );
}
