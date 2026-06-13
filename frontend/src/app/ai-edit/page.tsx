"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  EditOptionsCollapse,
  PromptInput,
} from "@/components/features/PromptEditor";
import { ImagePreview } from "@/components/features/ImageCompare";
import {
  ImageUploader,
  UploadedImage,
} from "@/components/features/ImageUploader";
import { Modal, Popconfirm } from "antd";

interface ImagePreviewState {
  images: string[];
  title: string;
  compareImages?: string[];
  initialIndex?: number;
}

interface AITask {
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

export default function AIEditPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [prompt, setPrompt] = useState(
    "去除图片中的所有中文水印和文字，把背景换成白色纯色背景"
  );
  const [seed, setSeed] = useState(-1);
  const [scale, setScale] = useState(0.5);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(
    null
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

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.get<AITask[]>(
        "/ai/tasks?task_type=image_edit&limit=50"
      );
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch AI tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchTasks();
  }, [authLoading, isAuthenticated, fetchTasks, router]);

  const hasActiveTasks = tasks.some(
    (t) => t.status === "pending" || t.status === "running"
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated || !hasActiveTasks) return;

    const interval = setInterval(fetchTasks, 2000);
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
        task.output_data.processed_images.length > 0
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
        }
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

  const canSubmit = uploadedImages.length > 0 && !submitting;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-lg py-xxl">
      <div className="flex items-center justify-between gap-md mb-lg">
        <h2 className="text-title font-medium">改图任务</h2>
        <Button variant="primary" onClick={() => setSubmitModalOpen(true)}>
          发起 AI 改图
        </Button>
      </div>

      <Modal
        title="发起 AI 改图"
        open={submitModalOpen}
        onCancel={closeSubmitModal}
        width={880}
        destroyOnClose
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="secondary" onClick={closeSubmitModal}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
              title={uploadedImages.length === 0 ? "请先上传图片" : undefined}
            >
              确认发起
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-lg md:items-stretch">
          <div className="md:col-span-1 min-h-0">
            <ImageUploader
              images={uploadedImages}
              onChange={setUploadedImages}
            />
          </div>
          <div className="md:col-span-2 min-h-[280px] md:min-h-0 flex">
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
          <p className="text-caption text-ink-muted-48 mt-md">
            请先上传至少一张图片
          </p>
        )}
      </Modal>

      {loading ? (
        <div className="text-center py-xl text-ink-muted-48">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-xl text-ink-muted-48">暂无改图任务</div>
      ) : (
        <Card variant="light" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-canvas-parchment">
                  <th className="px-lg py-md text-caption font-medium text-ink-muted-48 whitespace-nowrap">
                    输入图
                  </th>
                  <th className="px-lg py-md text-caption font-medium text-ink-muted-48 min-w-[200px]">
                    提示词
                  </th>
                  <th className="px-lg py-md text-caption font-medium text-ink-muted-48 whitespace-nowrap">
                    状态
                  </th>
                  <th className="px-lg py-md text-caption font-medium text-ink-muted-48 whitespace-nowrap">
                    次数
                  </th>
                  <th className="px-lg py-md text-caption font-medium text-ink-muted-48 whitespace-nowrap">
                    创建时间
                  </th>
                  <th className="px-lg py-md text-caption font-medium text-ink-muted-48 whitespace-nowrap text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const inputUrls = task.input_data?.image_urls || [];
                  const visibleUrls = inputUrls.slice(0, 2);
                  const extraCount = inputUrls.length - 2;

                  return (
                    <tr
                      key={task.id}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-canvas-parchment/50"
                    >
                      <td className="px-lg py-md align-middle">
                        {inputUrls.length > 0 ? (
                          <div className="flex items-center gap-xs">
                            {visibleUrls.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => openInputPreview(inputUrls, i)}
                                className="shrink-0 rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-primary transition-shadow cursor-pointer"
                                title={`预览输入图 ${i + 1}`}
                              >
                                <img
                                  src={url}
                                  alt={`输入图 ${i + 1}`}
                                  className="w-10 h-10 object-cover block"
                                />
                              </button>
                            ))}
                            {extraCount > 0 && (
                              <button
                                type="button"
                                onClick={() => openInputPreview(inputUrls, 2)}
                                className="text-caption text-primary hover:underline px-xs"
                                title="预览全部输入图"
                              >
                                +{extraCount}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-caption text-ink-muted-48">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-lg py-md align-middle max-w-xs">
                        <p
                          className="text-body-sm text-ink truncate"
                          title={task.input_data?.prompt || undefined}
                        >
                          {task.input_data?.prompt || "-"}
                        </p>
                        {task.error_message && (
                          <p
                            className="text-caption text-red mt-xs truncate"
                            title={task.error_message}
                          >
                            {task.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-lg py-md align-middle whitespace-nowrap">
                        <StatusBadge
                          status={task.status}
                          label={getStatusLabel(task)}
                        />
                      </td>
                      <td className="px-lg py-md align-middle text-body-sm text-ink-muted-48 whitespace-nowrap">
                        第 {task.retry_count + 1} 次
                      </td>
                      <td className="px-lg py-md align-middle text-body-sm text-ink-muted-48 whitespace-nowrap">
                        {formatTime(task.created_at)}
                      </td>
                      <td className="px-lg py-md align-middle whitespace-nowrap text-right">
                        <div className="flex justify-end gap-xs">
                          {(task.status === "pending" ||
                            task.status === "running") && (
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
                              onConfirm={() => handleCancel(task.id)}
                            >
                              <span>
                                <Button variant="ghost" size="sm">
                                  终止
                                </Button>
                              </span>
                            </Popconfirm>
                          )}
                          {hasViewableResults(task) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openResultPreview(task)}
                            >
                              查看结果
                            </Button>
                          )}
                          {task.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetry(task)}
                            >
                              重试
                            </Button>
                          )}
                          <Popconfirm
                            title="确定删除该改图任务？"
                            description="此操作不可恢复。"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => deleteTask(task)}
                          >
                            <span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red hover:bg-red/10"
                              >
                                删除
                              </Button>
                            </span>
                          </Popconfirm>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
