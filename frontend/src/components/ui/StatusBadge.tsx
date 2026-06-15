"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type StatusType =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled"
  | "draft"
  | "submitting";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { bg: string; text: string; defaultLabel: string }
> = {
  pending: {
    bg: "bg-surface-night dark:bg-surface-night",
    text: "text-on-primary",
    defaultLabel: "待处理",
  },
  running: {
    bg: "bg-accent-violet-mid/25",
    text: "text-accent-violet-mid dark:text-on-primary",
    defaultLabel: "处理中",
  },
  success: {
    bg: "bg-accent-lime/25",
    text: "text-ink-deep dark:text-accent-lime",
    defaultLabel: "已完成",
  },
  failed: {
    bg: "bg-accent-pink/25",
    text: "text-ink-deep dark:text-accent-pink",
    defaultLabel: "失败",
  },
  cancelled: {
    bg: "bg-surface-elevated",
    text: "text-muted dark:text-on-dark-muted",
    defaultLabel: "已取消",
  },
  draft: {
    bg: "bg-surface-night/10 dark:bg-surface-night",
    text: "text-body dark:text-on-dark-muted",
    defaultLabel: "草稿",
  },
  submitting: {
    bg: "bg-accent-violet-deep/30",
    text: "text-accent-violet-mid dark:text-on-primary",
    defaultLabel: "提交中",
  },
};

export function StatusBadge({
  status,
  label,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center min-h-[22px] px-sm py-xxs rounded-xs font-text text-micro-cap uppercase tracking-[0.25px] ${config.bg} ${config.text} ${className}`}
    >
      {status === "running" && (
        <Loader2
          className="animate-spin -ml-0.5 mr-1 h-3 w-3 shrink-0"
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  );
}
