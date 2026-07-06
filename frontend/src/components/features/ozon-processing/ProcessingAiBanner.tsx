"use client";

import React from "react";
import { Info, Loader2, Sparkles } from "lucide-react";

interface ProcessingAiBannerProps {
  onOptimize: () => void;
  optimizing: boolean;
}

export function ProcessingAiBanner({ onOptimize, optimizing }: ProcessingAiBannerProps) {
  return (
    <div className="rounded-xl border border-[#0369A1]/30 bg-[#EFF6FF] dark:bg-[#0369A1]/10 dark:border-[#0369A1]/40 p-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
      <div className="flex gap-sm min-w-0">
        <Info
          className="h-5 w-5 shrink-0 text-[#0369A1] dark:text-[#38BDF8] mt-0.5"
          aria-hidden="true"
        />
        <div>
          <p className="text-body font-medium text-ink">中文编辑模式</p>
          <p className="text-caption text-muted mt-xs">
            当前以中文编辑商品标题、标签与描述。上架前将自动转为俄文，无需在此阶段手动翻译。
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOptimize}
        disabled={optimizing}
        className="inline-flex items-center justify-center gap-xs px-lg py-sm rounded-full bg-[#0369A1] text-white text-caption font-medium cursor-pointer transition-opacity duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      >
        {optimizing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        {optimizing ? "AI 优化中…" : "AI 一键优化"}
      </button>
    </div>
  );
}
