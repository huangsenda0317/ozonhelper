"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Sparkles, Wand2 } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  EditOptionsCollapse,
  PromptInput,
} from "@/components/features/PromptEditor";
import { ImagePreview } from "@/components/features/ImageCompare";
import {
  ImageUploader,
  UploadedImage,
} from "@/components/features/ImageUploader";
import { AITaskList, type AITask } from "@/components/features/AITaskList";

interface ImagePreviewState {
  images: string[];
  title: string;
  compareImages?: string[];
  initialIndex?: number;
}

function TaskStats({ tasks }: { tasks: AITask[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const running = tasks.filter(
    (t) => t.status === "pending" || t.status === "running",
  ).length;
  const success = tasks.filter((t) => t.status === "success").length;
  const failed = tasks.filter((t) => t.status === "failed").length;

  const statClass = isDark
    ? "font-display text-heading-lg text-on-primary"
    : "font-display text-heading-lg text-ink-deep";
  const highlightClass = isDark
    ? "font-display text-heading-lg text-accent-lime"
    : "font-display text-heading-lg text-ink-deep";

  return (
    <dl className="flex flex-wrap gap-xl">
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
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prompt, setPrompt] = useState(
    "去除图片中的所有中文水印和文字，把背景换成白色纯色背景",
  );
  const [seed, setSeed] = useState(-1);
  const [scale, setScale] = useState(0.5);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(
    null,
  );

  const revokeUploadedPreviews = useCallback((images: UploadedImage[]) => {
    images.forEach((img) => {
      if (img.preview.startsWith("blob:")) {
        URL.revokeObjectURL(img.preview);
      }
    });
  }, []);

  const closeSubmitModal = useCallback(() => {
    setSubmitModalOpen(false);
    setUploadedImages((prev) => {
      revokeUploadedPreviews(prev);
      return [];
    });
  }, [revokeUploadedPreviews]);

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

  const handleSubmit = async () => {
    if (uploadedImages.length === 0) return;
    setSubmitting(true);
    try {
      const response = await apiClient.post<{ task_id: string }>(
        "/ai/image-edit",
        {
          prompt,
          seed,
          scale,
          image_urls: uploadedImages.map((img) => img.url),
          object_names: uploadedImages.map((img) => img.object_name),
        },
      );
      if (response.success) {
        fetchTasks();
        closeSubmitModal();
      }
    } catch (err) {
      console.error("Failed to submit image edit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (task: AITask) => {
    try {
      await apiClient.post(`/ai/image-edit/${task.id}/retry`, {
        prompt: task.input_data?.prompt ?? prompt,
        scale: task.input_data?.scale ?? scale,
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
    document
      .getElementById("ai-edit-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const canSubmit = uploadedImages.length > 0 && !submitting;

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchTasks({ keepLoading: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      {/* Page header */}
      <header className="mb-xl">
        <p className="eyebrow-cap">AI IMAGES</p>
        <div className="flex flex-col gap-lg sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display font-bold text-heading-md text-ink">
            AI{" "}
            <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
              改图
            </span>
          </h1>
          {!loading && tasks.length > 0 && <TaskStats tasks={tasks} />}
        </div>
      </header>

      {/* Bento dual-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Left: upload + prompt */}
        <div id="ai-edit-form">
          <Card variant="default" padding="lg" className="space-y-xl">
            <div>
              <h2 className="text-heading-sm font-display text-ink mb-xs flex items-center gap-sm">
                <ImagePlus
                  className="h-5 w-5 text-accent-violet-mid shrink-0"
                  aria-hidden="true"
                />
                上传与提示词
              </h2>
              <p className="text-caption text-body">
                支持 JPG / PNG / WebP，单文件 ≤10MB，最多 10 张
              </p>
            </div>

            <div className="flex flex-col gap-lg w-full">
              <ImageUploader
                images={uploadedImages}
                onChange={setUploadedImages}
              />
              <div className="min-h-[220px] w-full flex">
                <PromptInput prompt={prompt} onPromptChange={setPrompt} />
              </div>
            </div>

            <EditOptionsCollapse
              prompt={prompt}
              seed={seed}
              scale={scale}
              onPromptChange={setPrompt}
              onSeedChange={setSeed}
              onScaleChange={setScale}
            />

            {uploadedImages.length === 0 && (
              <p className="text-caption text-muted flex items-center gap-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                请先上传至少一张图片
              </p>
            )}

            <div className="flex flex-wrap gap-sm pt-xs border-t border-hairline">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={submitting}
                title={uploadedImages.length === 0 ? "请先上传图片" : undefined}
                className="gap-sm"
              >
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                确认发起
              </Button>
              {uploadedImages.length > 0 && (
                <Button variant="ghost" onClick={closeSubmitModal}>
                  清空图片
                </Button>
              )}
            </div>
          </Card>
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
