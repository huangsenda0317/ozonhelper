"use client";

import React from "react";
import { PackagePlus, Trash2 } from "lucide-react";

import type { ProcessingStatus } from "@/lib/ozon-processing/types";

interface ProcessingBulkBarProps {
  selectedCount: number;
  activeStatus: ProcessingStatus;
  onBatchDelete: () => void;
  onBatchJoinListing?: () => void;
}

export function ProcessingBulkBar({
  selectedCount,
  activeStatus,
  onBatchDelete,
  onBatchJoinListing,
}: ProcessingBulkBarProps) {
  const disabled = selectedCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-sm">
      <span className="text-caption text-muted">
        {selectedCount > 0 ? `已选 ${selectedCount} 项` : "请选择商品进行操作"}
      </span>
      {activeStatus === "finished" && onBatchJoinListing && (
        <button
          type="button"
          disabled={disabled}
          onClick={onBatchJoinListing}
          className="bulk-action-btn bulk-action-btn--violet"
        >
          <PackagePlus className="h-3 w-3 shrink-0" aria-hidden="true" />
          批量加入待上架
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onBatchDelete}
        className="bulk-action-btn bulk-action-btn--danger"
      >
        <Trash2 className="h-3 w-3 shrink-0" aria-hidden="true" />
        批量删除
      </button>
    </div>
  );
}
