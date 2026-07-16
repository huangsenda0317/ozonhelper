"use client";

import React, { useCallback, useState } from "react";
import { Collapse, message } from "antd";
import { ImagePlus, Layers, Sparkles, Wand2 } from "lucide-react";

import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ImageUploader,
  UploadedImage,
} from "@/components/features/ImageUploader";

import { WorkflowStepList } from "./WorkflowStepList";
import {
  DEFAULT_WORKFLOW_STEPS,
  type WorkflowStepState,
  hasEnabledWorkflowStep,
  toWorkflowStepPayloads,
} from "./workflowSteps";

interface WorkflowEditPanelProps {
  onTasksRefresh: () => void;
}

interface WorkflowSubmitResponse {
  task_id: string;
  status: string;
  estimated_seededit_count: number;
  estimated_cost_yuan: number;
}

export function WorkflowEditPanel({ onTasksRefresh }: WorkflowEditPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [seed, setSeed] = useState(-1);
  const [scale, setScale] = useState(0.5);
  const [steps, setSteps] = useState<WorkflowStepState[]>(DEFAULT_WORKFLOW_STEPS);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const revokeUploadedPreviews = useCallback((images: UploadedImage[]) => {
    images.forEach((img) => {
      if (img.preview.startsWith("blob:")) {
        URL.revokeObjectURL(img.preview);
      }
    });
  }, []);

  const clearUploadedImages = useCallback(() => {
    setUploadedImages((prev) => {
      revokeUploadedPreviews(prev);
      return [];
    });
  }, [revokeUploadedPreviews]);

  const handleSubmit = async () => {
    if (uploadedImages.length !== 1) return;
    if (!hasEnabledWorkflowStep(steps)) {
      message.warning("请至少启用一个步骤");
      return;
    }

    const image = uploadedImages[0];
    setSubmitting(true);
    try {
      const response = await apiClient.post<WorkflowSubmitResponse>(
        "/ai/workflow",
        {
          image_url: image.url,
          object_name: image.object_name,
          steps: toWorkflowStepPayloads(steps),
          seed,
          scale,
        },
      );

      if (response.success && response.data) {
        const { estimated_seededit_count, estimated_cost_yuan } = response.data;
        message.success(
          `工作流已提交：预计 SeedEdit ${estimated_seededit_count} 次，约 ¥${estimated_cost_yuan.toFixed(1)}`,
        );
        onTasksRefresh();
        clearUploadedImages();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "提交失败，请稍后重试";
      message.error(msg);
      console.error("Failed to submit workflow:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const hasImage = uploadedImages.length === 1;
  const hasSteps = hasEnabledWorkflowStep(steps);
  const canSubmit = hasImage && hasSteps && !submitting;

  return (
    <Card variant="default" padding="lg" className="space-y-xl">
      <div>
        <h2 className="text-heading-sm font-display text-ink mb-xs flex items-center gap-sm">
          <Layers
            className="h-5 w-5 text-accent-violet-mid shrink-0"
            aria-hidden="true"
          />
          工作流改图
        </h2>
        <p className="text-caption text-body">
          上传 1 张主图，勾选并调整步骤顺序后一键执行
        </p>
      </div>

      <div className="space-y-sm">
        <div className="flex items-center gap-sm text-caption font-medium text-ink">
          <ImagePlus className="h-4 w-4 text-muted shrink-0" aria-hidden="true" />
          主图
        </div>
        <p className="text-caption text-muted">
          支持 JPG / PNG / WebP，单文件 ≤10MB，仅 1 张
        </p>
        <ImageUploader
          images={uploadedImages}
          onChange={setUploadedImages}
          maxCount={1}
        />
      </div>

      <div className="space-y-sm">
        <h3 className="text-caption font-medium text-ink">处理步骤</h3>
        <WorkflowStepList steps={steps} onChange={setSteps} />
      </div>

      <Collapse
        defaultActiveKey={[]}
        items={[
          {
            key: "advanced",
            label: "高级",
            children: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
                <div>
                  <label className="block text-caption font-medium text-body mb-xs">
                    随机种子 (seed): {seed}
                  </label>
                  <input
                    type="range"
                    min={-1}
                    max={99999}
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                    className="w-full accent-primary"
                  />
                  <span className="text-caption text-muted">-1 = 随机</span>
                </div>
                <div>
                  <label className="block text-caption font-medium text-body mb-xs">
                    编辑强度 (scale): {scale}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <span className="text-caption text-muted">
                    越大指令越强，原图影响越小
                  </span>
                </div>
              </div>
            ),
          },
        ]}
      />

      {!hasImage && (
        <p className="text-caption text-muted flex items-center gap-xs">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          请先上传一张主图
        </p>
      )}
      {hasImage && !hasSteps && (
        <p className="text-caption text-muted flex items-center gap-xs">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          请至少启用一个步骤
        </p>
      )}

      <div className="flex flex-wrap gap-sm pt-xs border-t border-hairline">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          title={
            !hasImage
              ? "请先上传图片"
              : !hasSteps
                ? "请至少启用一个步骤"
                : undefined
          }
          className="gap-sm"
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          确认发起
        </Button>
        {uploadedImages.length > 0 && (
          <Button variant="ghost" onClick={clearUploadedImages}>
            清空图片
          </Button>
        )}
      </div>
    </Card>
  );
}
