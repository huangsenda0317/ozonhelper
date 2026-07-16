"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
    [applySuggestions, baseImageUrl, items],
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
      padding="lg"
      className="w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-md mb-lg shrink-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg flex-1 min-h-0 overflow-hidden">
        {/* 左：画布 */}
        <div className="flex flex-col min-h-0">
          <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-sm">
            画布预览
          </p>
          <div
            ref={canvasRef}
            className="relative aspect-square w-full bg-surface-elevated rounded-lg overflow-hidden border border-hairline select-none touch-none"
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
                  className={`absolute cursor-grab active:cursor-grabbing px-xs py-xxs rounded-xs transition-shadow ${
                    isSelected
                      ? "ring-2 ring-accent-violet-mid shadow-md"
                      : "hover:ring-1 hover:ring-hairline"
                  }`}
                  style={{
                    left: `${item.x * 100}%`,
                    top: `${item.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    font: buildFontStyle({
                      ...item,
                      fontSize: displaySize,
                    }),
                    color: item.color,
                    textAlign: item.align,
                    whiteSpace: "pre-wrap",
                    maxWidth: "90%",
                  }}
                  onPointerDown={(e) => handlePointerDown(e, item.id)}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedId(item.id);
                    }
                  }}
                >
                  {item.text || (
                    <span className="opacity-50 text-caption">（空文案）</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-sm mt-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void runSuggestLayout()}
              loading={layoutLoading}
              disabled={items.length === 0}
              className="gap-xs normal-case"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              重新 AI 定位
            </Button>
          </div>
        </div>

        {/* 右：列表与样式 */}
        <div className="flex flex-col min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-sm">
            <p className="text-micro-cap uppercase tracking-[0.25px] text-muted">
              文字列表 ({items.length})
            </p>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleAddItem}
              className="gap-xs normal-case"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              添加
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-caption text-muted py-lg text-center border border-dashed border-hairline rounded-lg">
              暂无文案。可直接「导出并完成」跳过注解，或添加俄文文字。
            </p>
          ) : (
            <div className="space-y-md">
              {items.map((item, index) => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-md space-y-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "border-accent-violet-mid bg-surface-elevated"
                        : "border-hairline hover:border-hairline-violet"
                    }`}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelectedId(item.id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center justify-between gap-sm">
                      <span className="text-caption font-medium text-ink">
                        文案 {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                        className="p-xxs rounded interactive-muted-soft text-muted hover:text-accent-pink cursor-pointer"
                        aria-label={`删除文案 ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-micro-cap text-muted mb-xxs">
                        俄文
                      </label>
                      <textarea
                        value={item.text}
                        onChange={(e) =>
                          updateItem(item.id, { text: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        rows={2}
                        className="w-full text-caption rounded-md border border-hairline bg-surface-card px-sm py-xs resize-y focus:outline-none focus:ring-2 focus:ring-accent-violet-mid/40"
                        placeholder="输入俄文商品文案"
                      />
                    </div>

                    <div>
                      <label className="block text-micro-cap text-muted mb-xxs">
                        中文草稿
                      </label>
                      <textarea
                        value={item.draftZh ?? ""}
                        onChange={(e) =>
                          updateItem(item.id, { draftZh: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        rows={2}
                        className="w-full text-caption rounded-md border border-hairline bg-surface-card px-sm py-xs resize-y focus:outline-none focus:ring-2 focus:ring-accent-violet-mid/40"
                        placeholder="填写中文后翻译填入俄文"
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTranslate(item.id);
                        }}
                        loading={translatingId === item.id}
                        disabled={!item.draftZh?.trim()}
                        className="mt-xs gap-xs normal-case"
                      >
                        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                        从中文翻译填入
                      </Button>
                    </div>

                    {isSelected && (
                      <div
                        className="grid grid-cols-2 gap-sm pt-sm border-t border-hairline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="block text-micro-cap text-muted mb-xxs">
                            字体
                          </label>
                          <select
                            value={item.fontFamily}
                            onChange={(e) =>
                              updateItem(item.id, {
                                fontFamily: e.target.value,
                              })
                            }
                            className="w-full text-caption rounded-md border border-hairline bg-surface-card px-sm py-xs"
                          >
                            {CYRILLIC_FONT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-micro-cap text-muted mb-xxs">
                            字号 {item.fontSize}
                          </label>
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
                            className="w-full accent-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-micro-cap text-muted mb-xxs">
                            颜色
                          </label>
                          <input
                            type="color"
                            value={item.color}
                            onChange={(e) =>
                              updateItem(item.id, { color: e.target.value })
                            }
                            className="w-full h-8 rounded-md border border-hairline cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-micro-cap text-muted mb-xxs">
                            样式
                          </label>
                          <div className="flex flex-wrap gap-xs">
                            <label className="flex items-center gap-xxs text-caption cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.bold}
                                onChange={(e) =>
                                  updateItem(item.id, { bold: e.target.checked })
                                }
                              />
                              粗体
                            </label>
                            <label className="flex items-center gap-xxs text-caption cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.italic}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    italic: e.target.checked,
                                  })
                                }
                              />
                              斜体
                            </label>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-micro-cap text-muted mb-xxs">
                            对齐
                          </label>
                          <div className="flex gap-xs">
                            {(
                              [
                                { value: "left" as const, icon: AlignLeft },
                                { value: "center" as const, icon: AlignCenter },
                                { value: "right" as const, icon: AlignRight },
                              ] as const
                            ).map(({ value, icon: Icon }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  updateItem(item.id, { align: value })
                                }
                                className={`p-xs rounded-md border cursor-pointer transition-colors ${
                                  item.align === value
                                    ? "border-accent-violet-mid bg-surface-elevated"
                                    : "border-hairline interactive-muted-soft"
                                }`}
                                aria-label={`${value} 对齐`}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-sm pt-lg mt-lg border-t border-hairline shrink-0">
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
