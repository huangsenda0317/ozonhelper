"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { ImagePreview } from "@/components/features/ImageCompare";
import { AITaskList, type AITask } from "@/components/features/AITaskList";
import { FreeformEditPanel } from "@/components/features/ai-edit/FreeformEditPanel";
import { WorkflowEditPanel } from "@/components/features/ai-edit/WorkflowEditPanel";

type EditMode = "workflow" | "freeform";

interface ImagePreviewState {
  images: string[];
  title: string;
  compareImages?: string[];
  initialIndex?: number;
}

const MODE_TABS: { value: EditMode; label: string }[] = [
  { value: "workflow", label: "工作流" },
  { value: "freeform", label: "自由改图" },
];

function TaskStatsSkeleton() {
  return (
    <dl
      className="flex flex-wrap gap-lg justify-start sm:justify-end"
      aria-busy="true"
      aria-label="加载任务统计"
    >
      {["进行中", "已完成", "失败"].map((label) => (
        <div key={label}>
          <dt className="text-micro-cap uppercase tracking-[0.25px] text-muted">
            {label}
          </dt>
          <dd className="font-display text-heading-sm text-muted mt-xxs">
            <span className="inline-block h-6 w-6 rounded bg-hairline animate-pulse" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TaskStats({ tasks }: { tasks: AITask[] }) {
  const running = tasks.filter(
    (t) => t.status === "pending" || t.status === "running",
  ).length;
  const success = tasks.filter((t) => t.status === "success").length;
  const failed = tasks.filter((t) => t.status === "failed").length;

  const statClass =
    "font-display text-heading-sm text-ink-deep dark:text-on-primary";
  const highlightClass =
    "font-display text-heading-sm text-ink-deep dark:text-accent-lime";

  return (
    <dl className="flex flex-wrap gap-lg justify-start sm:justify-end">
      <div>
        <dt className="text-micro-cap uppercase tracking-[0.25px] text-muted">
          进行中
        </dt>
        <dd className={running > 0 ? highlightClass : statClass}>{running}</dd>
      </div>
      <div>
        <dt className="text-micro-cap uppercase tracking-[0.25px] text-muted">
          已完成
        </dt>
        <dd className={statClass}>{success}</dd>
      </div>
      <div>
        <dt className="text-micro-cap uppercase tracking-[0.25px] text-muted">
          失败
        </dt>
        <dd className={statClass}>{failed}</dd>
      </div>
    </dl>
  );
}

export default function AIEditPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<EditMode>("workflow");
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(
    null,
  );

  const fetchTasks = useCallback(
    async (options?: { keepLoading?: boolean }) => {
      try {
        const response = await apiClient.get<AITask[]>(
          "/ai/tasks?task_type=image_edit&limit=50",
        );
        if (response.success && response.data) {
          setTasks(response.data);
          setLastRefreshedAt(new Date());
        }
      } catch (err) {
        console.error("Failed to fetch AI tasks:", err);
      } finally {
        if (!options?.keepLoading) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchTasks();
  }, [authLoading, isAuthenticated, fetchTasks, router]);

  const hasActiveTasks = tasks.some(
    (t) => t.status === "pending" || t.status === "running",
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated || !hasActiveTasks) return;

    const interval = setInterval(() => fetchTasks({ keepLoading: true }), 2000);
    return () => clearInterval(interval);
  }, [authLoading, isAuthenticated, hasActiveTasks, fetchTasks]);

  const getStatusLabel = (task: AITask): string | undefined => {
    if (task.status === "pending") {
      return "排队中";
    }
    if (task.status === "awaiting_annotation") {
      return "待注解";
    }
    if (task.status === "running") {
      const total =
        task.input_data?.items_total ?? task.output_data?.items_total;
      const inProgress = task.input_data?.items_in_progress;
      const done =
        task.input_data?.items_completed ??
        task.output_data?.items_completed ??
        0;

      if (inProgress && total) {
        return `处理中 ${inProgress}/${total}`;
      }
      if (total) {
        return `处理中 ${done}/${total}`;
      }
      return "处理中";
    }
    if (task.status === "cancelled") {
      const total = task.input_data?.items_total;
      const done =
        task.output_data?.items_completed ??
        task.output_data?.processed_images?.length ??
        0;
      if (done > 0 && total) {
        return `已终止 ${done}/${total}`;
      }
      return "已终止";
    }
    return undefined;
  };

  const hasViewableResults = (task: AITask) =>
    Boolean(
      task.output_data?.processed_images &&
      task.output_data.processed_images.length > 0,
    );

  const handleRetry = async (task: AITask) => {
    try {
      await apiClient.post(`/ai/image-edit/${task.id}/retry`, {
        prompt:
          task.input_data?.prompt ??
          "去除图片中的所有中文水印和文字，把背景换成白色纯色背景",
        scale: task.input_data?.scale ?? 0.5,
      });
      fetchTasks();
    } catch (err) {
      console.error("Failed to retry:", err);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await apiClient.post(`/ai/tasks/${taskId}/cancel`);
      fetchTasks();
    } catch (err) {
      console.error("Failed to cancel task:", err);
    }
  };

  const deleteTask = async (task: AITask) => {
    try {
      await apiClient.delete(`/ai/tasks/${task.id}`);
      setImagePreview(null);
      fetchTasks();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const openInputPreview = (urls: string[], index = 0) => {
    setImagePreview({ images: urls, title: "输入图预览", initialIndex: index });
  };

  const openResultPreview = (task: AITask) => {
    if (!task.output_data?.processed_images?.length) return;
    setImagePreview({
      images: task.output_data.processed_images,
      title: "改图结果",
      compareImages: task.input_data?.image_urls,
    });
  };

  const scrollToForm = () => {
    setMode("freeform");
    requestAnimationFrame(() => {
      document
        .getElementById("ai-edit-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchTasks({ keepLoading: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      {/* Page header */}
      <header className="mb-xl">
        <p className="eyebrow-cap mb-sm">AI IMAGES</p>
        <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display font-bold text-heading-md text-ink">
              AI{" "}
              <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
                改图
              </span>
            </h1>
            <p className="text-caption text-muted mt-xs">
              工作流一键改图，或自由填写提示词批量改图
            </p>
          </div>
          <div className="min-w-[200px] shrink-0">
            {loading ? <TaskStatsSkeleton /> : <TaskStats tasks={tasks} />}
          </div>
        </div>
      </header>

      {/* Mode tabs — mirrors RankingsTabs / nav-tab patterns */}
      <div
        role="tablist"
        aria-label="改图模式"
        className="flex flex-wrap gap-xs border-b border-hairline pb-sm mb-xl"
      >
        {MODE_TABS.map((tab) => {
          const active = mode === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(tab.value)}
              className={`px-md py-xs text-caption rounded-md whitespace-nowrap cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
                active ? "nav-tab-active font-medium" : "interactive-muted-soft"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bento dual-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Left: mode panel */}
        <div id="ai-edit-form">
          {mode === "workflow" ? (
            <WorkflowEditPanel onTasksRefresh={() => fetchTasks()} />
          ) : (
            <FreeformEditPanel onTasksRefresh={() => fetchTasks()} />
          )}
        </div>

        {/* Right: task list */}
        <Card
          variant="default"
          padding="lg"
          className="flex flex-col min-h-[480px]"
        >
          <AITaskList
            tasks={tasks}
            loading={loading}
            refreshing={refreshing}
            hasActiveTasks={hasActiveTasks}
            lastRefreshedAt={lastRefreshedAt}
            onRefresh={handleManualRefresh}
            getStatusLabel={getStatusLabel}
            hasViewableResults={hasViewableResults}
            onInputPreview={openInputPreview}
            onResultPreview={openResultPreview}
            onCancel={handleCancel}
            onRetry={handleRetry}
            onDelete={deleteTask}
            onStartEmpty={scrollToForm}
          />
        </Card>
      </div>

      {imagePreview && (
        <ImagePreview
          images={imagePreview.images}
          title={imagePreview.title}
          compareImages={imagePreview.compareImages}
          initialIndex={imagePreview.initialIndex}
          onClose={() => setImagePreview(null)}
        />
      )}
    </div>
  );
}
