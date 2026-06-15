"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Languages,
  Sparkles,
} from "lucide-react";

import { apiClient, ApiError } from "@/lib/api-client";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

const MAX_CHARS = 6000;

interface TranslateTextResult {
  target_text: string;
  used_amount: number;
  source_lang: string;
  target_lang: string;
}

interface TranslateTask {
  id: string;
  task_type: string;
  status: "pending" | "running" | "success" | "failed";
  input_data: {
    fields: string[];
    source_lang: string;
    target_lang: string;
  } | null;
  output_data: {
    translations: Record<string, string>;
    used_amount: number;
  } | null;
  error_message: string | null;
  created_at: string;
}

function HistorySkeleton() {
  return (
    <div className="space-y-md animate-pulse" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-xl border border-hairline bg-surface-card"
        />
      ))}
    </div>
  );
}

function TaskIdChip({ id }: { id: string }) {
  const short = id.length > 12 ? `${id.slice(0, 8)}…` : id;
  return (
    <code
      className="inline-block font-mono text-micro-cap text-on-primary bg-surface-night px-sm py-xxs rounded-md max-w-[100px] truncate"
      title={id}
    >
      {short}
    </code>
  );
}

export default function TranslatePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [usedAmount, setUsedAmount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tasks, setTasks] = useState<TranslateTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TranslateTask | null>(null);
  const [editText, setEditText] = useState("");

  const charCount = sourceText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmptyInput = !sourceText.trim();
  const canTranslate = !isEmptyInput && !isOverLimit && !submitting;

  const successCount = tasks.filter((t) => t.status === "success").length;

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.get<TranslateTask[]>(
        "/ai/tasks?task_type=translate&limit=50",
      );
      if (response.success && response.data) setTasks(response.data);
    } catch (err) {
      console.error("Failed to fetch translate tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleTranslate = async () => {
    if (!canTranslate) {
      if (isEmptyInput) setError("请输入待翻译文本");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post<TranslateTextResult>(
        "/ai/translate-text",
        {
          source_text: sourceText.trim(),
          source_lang: "zh",
          target_lang: "ru",
        },
      );
      if (response.success && response.data) {
        setTargetText(response.data.target_text);
        setUsedAmount(response.data.used_amount);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "翻译失败，请稍后重试";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!targetText) return;
    try {
      await navigator.clipboard.writeText(targetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动选择文本复制");
    }
  };

  const handleSaveEdit = async (taskId: string) => {
    try {
      await apiClient.put(`/ai/tasks/${taskId}/output`, {
        output_data: { ...editingTask?.output_data, manual_edit: editText },
      });
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      console.error("Failed to save edit:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="mb-xl">
        <p className="eyebrow-cap mb-sm">腾讯云 TMT · zh → ru</p>
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display font-bold text-heading-md text-ink">
            AI{" "}
            <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
              翻译
            </span>
          </h1>
          {!loadingTasks && tasks.length > 0 && (
            <p
              className={`font-display text-heading-lg ${
                isDark ? "text-on-primary" : "text-ink-deep"
              }`}
            >
              {successCount}
              <span className="text-caption text-muted font-text ml-xs">
                / {tasks.length} 已完成
              </span>
            </p>
          )}
        </div>
        <p className="text-body text-body mt-sm">
          5 次/秒，单次最长 6000 字符
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Left: source input */}
        <Card variant="default" padding="lg" className="flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-heading-sm font-display text-ink flex items-center gap-sm">
              <Languages className="h-5 w-5 text-accent-violet-mid" aria-hidden="true" />
              原文（中文）
            </h2>
            <span
              className={`text-caption ${
                isOverLimit ? "text-accent-pink font-medium" : "text-muted"
              }`}
            >
              {charCount} / {MAX_CHARS}
            </span>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              if (error === "请输入待翻译文本") setError(null);
            }}
            placeholder="请输入中文原文…"
            className="input-sentry flex-1 min-h-[240px] resize-none leading-normal"
          />
          {error && (
            <p className="text-caption text-accent-pink mt-md">{error}</p>
          )}
        </Card>

        {/* Right: target output + action */}
        <Card variant="default" padding="lg" className="flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-heading-sm font-display text-ink">译文（俄文）</h2>
            <div className="flex items-center gap-sm">
              {usedAmount !== null && (
                <span className="text-caption text-muted">
                  消耗 {usedAmount} 字符
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={!targetText}
                onClick={handleCopy}
                className="gap-xs"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-[200px] rounded-sm border border-hairline bg-surface-elevated px-lg py-md overflow-auto">
            {targetText ? (
              <p className="text-body whitespace-pre-wrap leading-normal text-ink">
                {targetText}
              </p>
            ) : (
              <p className="text-body text-muted flex items-center gap-sm">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                翻译结果将显示在这里
              </p>
            )}
          </div>
          <div className="mt-lg pt-lg border-t border-hairline">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={!canTranslate}
              onClick={handleTranslate}
              className="gap-sm"
            >
              {submitting ? null : (
                <Languages className="h-4 w-4" aria-hidden="true" />
              )}
              翻译
            </Button>
          </div>
        </Card>
      </div>

      {/* History */}
      <section className="mt-xl">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex items-center gap-sm text-body font-medium text-ink hover:text-body cursor-pointer transition-colors duration-200 mb-lg"
          aria-expanded={historyOpen}
        >
          {historyOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          历史任务
          {tasks.length > 0 && (
            <span className="text-caption text-muted">({tasks.length})</span>
          )}
        </button>

        {historyOpen &&
          (loadingTasks ? (
            <HistorySkeleton />
          ) : tasks.length === 0 ? (
            <Card variant="default" padding="lg" className="text-center">
              <Languages
                className="h-10 w-10 text-accent-violet-mid mx-auto mb-md"
                aria-hidden="true"
              />
              <p className="text-heading-sm text-ink mb-xs">暂无翻译任务</p>
              <p className="text-caption text-muted">
                在上方输入中文并点击翻译
              </p>
            </Card>
          ) : (
            <div className="space-y-md">
              {tasks.map((task) => (
                <Card key={task.id} variant="default" padding="md">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-md">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-sm mb-sm">
                        <TaskIdChip id={task.id} />
                        <StatusBadge
                          status={
                            task.status as
                              | "pending"
                              | "running"
                              | "success"
                              | "failed"
                          }
                        />
                        <span className="text-caption text-muted">
                          {task.input_data?.source_lang} →{" "}
                          {task.input_data?.target_lang}
                        </span>
                        {task.output_data?.used_amount != null && (
                          <span className="text-caption text-muted">
                            消耗 {task.output_data.used_amount} 字符
                          </span>
                        )}
                      </div>
                      {task.output_data?.translations && (
                        <div className="mt-sm space-y-xs">
                          {Object.entries(task.output_data.translations).map(
                            ([field, text]) => (
                              <div
                                key={field}
                                className="bg-surface-elevated rounded-md p-sm border border-hairline"
                              >
                                <span className="text-micro-cap uppercase tracking-[0.25px] text-muted">
                                  {field}
                                </span>
                                <p className="text-body mt-xxs leading-normal">
                                  {text}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                      {task.error_message && (
                        <p className="text-caption text-accent-pink mt-sm">
                          {task.error_message}
                        </p>
                      )}
                    </div>
                    {task.status === "success" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTask(task);
                          setEditText(
                            task.output_data?.translations?.title || "",
                          );
                        }}
                      >
                        编辑
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ))}
      </section>

      {editingTask && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-translate-title"
        >
          <Card
            variant="default"
            padding="lg"
            className="max-w-2xl w-full"
          >
            <h3
              id="edit-translate-title"
              className="text-heading-sm font-display text-ink mb-lg"
            >
              编辑翻译结果
            </h3>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="input-sentry resize-none min-h-[160px]"
            />
            <div className="flex gap-md justify-end mt-lg">
              <Button variant="ghost" onClick={() => setEditingTask(null)}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSaveEdit(editingTask.id)}
              >
                保存
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
