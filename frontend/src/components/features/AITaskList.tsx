"use client";

import React from "react";
import {
  Ban,
  Eye,
  ImagePlus,
  RefreshCw,
  Trash2,
  Wand2,
} from "lucide-react";
import { Popconfirm } from "antd";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

export interface AITask {
  id: string;
  task_type: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  input_data: {
    prompt: string;
    seed: number;
    scale: number;
    image_urls?: string[];
    object_names?: string[];
    items_total?: number;
    items_completed?: number;
    items_in_progress?: number;
  } | null;
  output_data: {
    processed_images: string[];
    items_total?: number;
    items_completed?: number;
  } | null;
  seededit_status: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

interface AITaskListProps {
  tasks: AITask[];
  loading: boolean;
  refreshing: boolean;
  hasActiveTasks: boolean;
  lastRefreshedAt: Date | null;
  onRefresh: () => void;
  getStatusLabel: (task: AITask) => string | undefined;
  hasViewableResults: (task: AITask) => boolean;
  onInputPreview: (urls: string[], index: number) => void;
  onResultPreview: (task: AITask) => void;
  onCancel: (taskId: string) => void;
  onRetry: (task: AITask) => void;
  onDelete: (task: AITask) => void;
  onStartEmpty: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastUpdated(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function TaskListSkeleton() {
  return (
    <div className="space-y-sm animate-pulse" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-hairline p-md flex gap-md"
        >
          <div className="w-14 h-10 rounded-md bg-hairline shrink-0" />
          <div className="flex-1 space-y-sm">
            <div className="h-3 w-3/4 rounded bg-hairline" />
            <div className="h-3 w-1/2 rounded bg-hairline" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyTaskState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-xxl text-center">
      <div className="mb-lg p-lg rounded-xxl bg-surface-elevated">
        <Wand2
          className="h-10 w-10 text-accent-violet-mid"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-heading-sm font-display text-ink mb-xs">
        暂无改图任务
      </h3>
      <p className="text-caption text-body max-w-xs mb-lg">
        在左侧上传商品图并填写提示词，发起 SeedEdit 3.0 改图任务
      </p>
      <Button variant="primary" onClick={onStart} className="gap-sm">
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
        开始改图
      </Button>
    </div>
  );
}

function TaskIconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center h-8 w-8 min-w-[32px] rounded-md shrink-0 bg-transparent hover:bg-surface-elevated transition-colors duration-200 cursor-pointer text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
        danger ? "hover:text-accent-pink" : ""
      }`}
    >
      {children}
    </button>
  );
}

function InputThumbnailStack({
  urls,
  onClick,
}: {
  urls: string[];
  onClick: () => void;
}) {
  if (urls.length === 0) {
    return (
      <span className="flex items-center justify-center w-14 h-10 shrink-0 text-caption text-muted">
        -
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-14 h-10 shrink-0 cursor-pointer group"
      title={`预览 ${urls.length} 张输入图`}
      aria-label={`预览 ${urls.length} 张输入图`}
    >
      {urls.length > 1 && (
        <span
          className="absolute top-0.5 left-2 w-10 h-10 rounded-md border border-hairline bg-surface-elevated"
          aria-hidden="true"
        />
      )}
      <span className="relative block w-10 h-10 rounded-md border border-hairline overflow-hidden group-hover:border-hairline-cool transition-colors duration-200">
        <img
          src={urls[0]}
          alt=""
          className="w-full h-full object-cover block"
        />
      </span>
      {urls.length > 1 && (
        <span className="absolute -bottom-0.5 right-0 min-w-[18px] h-[18px] px-0.5 rounded-full bg-surface-night text-on-primary text-[10px] font-mono leading-none flex items-center justify-center">
          {urls.length}
        </span>
      )}
    </button>
  );
}

function AITaskRow({
  task,
  getStatusLabel,
  hasViewableResults,
  onInputPreview,
  onResultPreview,
  onCancel,
  onRetry,
  onDelete,
}: {
  task: AITask;
  getStatusLabel: (task: AITask) => string | undefined;
  hasViewableResults: (task: AITask) => boolean;
  onInputPreview: (urls: string[], index: number) => void;
  onResultPreview: (task: AITask) => void;
  onCancel: (taskId: string) => void;
  onRetry: (task: AITask) => void;
  onDelete: (task: AITask) => void;
}) {
  const inputUrls = task.input_data?.image_urls || [];
  const prompt = task.input_data?.prompt || "-";

  return (
    <article className="rounded-lg border border-hairline p-md hover:bg-surface-elevated/50 transition-colors duration-200">
      <div className="flex gap-md min-w-0">
        <InputThumbnailStack
          urls={inputUrls}
          onClick={() => onInputPreview(inputUrls, 0)}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-sm min-w-0">
            <p
              className="flex-1 min-w-0 text-caption text-ink truncate"
              title={prompt !== "-" ? prompt : undefined}
            >
              {prompt}
            </p>
            <StatusBadge
              status={task.status}
              label={getStatusLabel(task)}
              className="shrink-0"
            />
          </div>

          {task.error_message && (
            <p
              className="text-caption text-accent-pink truncate mt-xxs"
              title={task.error_message}
            >
              {task.error_message}
            </p>
          )}

          <div className="flex items-center justify-between gap-sm mt-sm min-w-0">
            <p className="text-micro-cap text-muted truncate min-w-0">
              {inputUrls.length > 0
                ? `${inputUrls.length} 张输入`
                : "无输入图"}
              <span aria-hidden="true"> · </span>
              {formatTime(task.created_at)}
              {task.retry_count > 0 && (
                <>
                  <span aria-hidden="true"> · </span>
                  第 {task.retry_count + 1} 次
                </>
              )}
            </p>

            <div className="flex items-center shrink-0 h-8">
              {hasViewableResults(task) && (
                <TaskIconButton
                  label="查看结果"
                  onClick={() => onResultPreview(task)}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </TaskIconButton>
              )}

              {task.status === "failed" && (
                <TaskIconButton label="重试" onClick={() => onRetry(task)}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </TaskIconButton>
              )}

              {(task.status === "pending" || task.status === "running") && (
                <Popconfirm
                  title="确定终止该改图任务？"
                  description={
                    task.status === "running"
                      ? "已完成的图片将保留，其余不再处理。"
                      : "任务尚未开始，终止后无结果。"
                  }
                  okText="终止"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onCancel(task.id)}
                >
                  <span>
                    <TaskIconButton label="终止">
                      <Ban className="h-4 w-4" aria-hidden="true" />
                    </TaskIconButton>
                  </span>
                </Popconfirm>
              )}

              <Popconfirm
                title="确定删除该改图任务？"
                description="此操作不可恢复。"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(task)}
              >
                <span>
                  <TaskIconButton label="删除" danger>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </TaskIconButton>
                </span>
              </Popconfirm>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AITaskList({
  tasks,
  loading,
  refreshing,
  hasActiveTasks,
  lastRefreshedAt,
  onRefresh,
  getStatusLabel,
  hasViewableResults,
  onInputPreview,
  onResultPreview,
  onCancel,
  onRetry,
  onDelete,
  onStartEmpty,
}: AITaskListProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-md mb-lg">
        <h2 className="text-heading-sm font-display text-ink">任务列表</h2>
        <div className="flex items-center gap-sm shrink-0">
          {hasActiveTasks && (
            <span className="text-micro-cap text-muted flex items-center gap-xs">
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent-lime shrink-0"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">自动刷新中</span>
            </span>
          )}
          {lastRefreshedAt && (
            <span className="text-micro-cap text-muted hidden sm:inline tabular-nums">
              {formatLastUpdated(lastRefreshedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="刷新任务列表"
            aria-label="刷新任务列表"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-transparent hover:bg-surface-elevated text-muted hover:text-ink transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {loading ? (
        <TaskListSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyTaskState onStart={onStartEmpty} />
      ) : (
        <ul className="space-y-sm flex-1 list-none m-0 p-0">
          {tasks.map((task) => (
            <li key={task.id}>
              <AITaskRow
                task={task}
                getStatusLabel={getStatusLabel}
                hasViewableResults={hasViewableResults}
                onInputPreview={onInputPreview}
                onResultPreview={onResultPreview}
                onCancel={onCancel}
                onRetry={onRetry}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
