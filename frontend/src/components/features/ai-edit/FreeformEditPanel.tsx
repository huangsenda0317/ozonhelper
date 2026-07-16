"use client";

import React, { useCallback, useState } from "react";
import { ImagePlus, Sparkles, Wand2 } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  EditOptionsCollapse,
  PromptInput,
} from "@/components/features/PromptEditor";
import {
  ImageUploader,
  UploadedImage,
} from "@/components/features/ImageUploader";

interface FreeformEditPanelProps {
  onTasksRefresh: () => void;
}

export function FreeformEditPanel({ onTasksRefresh }: FreeformEditPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [prompt, setPrompt] = useState(
    "去除图片中的所有中文水印和文字，把背景换成白色纯色背景",
  );
  const [seed, setSeed] = useState(-1);
  const [scale, setScale] = useState(0.5);
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
        onTasksRefresh();
        clearUploadedImages();
      }
    } catch (err) {
      console.error("Failed to submit image edit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = uploadedImages.length > 0 && !submitting;

  return (
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
        <ImageUploader images={uploadedImages} onChange={setUploadedImages} />
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
          <Button variant="ghost" onClick={clearUploadedImages}>
            清空图片
          </Button>
        )}
      </div>
    </Card>
  );
}
