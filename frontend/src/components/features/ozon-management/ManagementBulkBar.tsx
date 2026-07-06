"use client";

import React from "react";
import { Rocket, Trash2 } from "lucide-react";

interface ManagementBulkBarProps {
  selectedCount: number;
  onBatchList: () => void;
  onBatchRemove: () => void;
}

export function ManagementBulkBar({
  selectedCount,
  onBatchRemove,
  onBatchList,
}: ManagementBulkBarProps) {
  const disabled = selectedCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-sm">
      <span className="text-caption text-muted">
        {selectedCount > 0 ? `已选 ${selectedCount} 项` : "请选择商品进行操作"}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onBatchList}
        className="bulk-action-btn bulk-action-btn--violet"
      >
        <Rocket className="h-3 w-3 shrink-0" aria-hidden="true" />
        批量上架
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onBatchRemove}
        className="bulk-action-btn bulk-action-btn--danger"
      >
        <Trash2 className="h-3 w-3 shrink-0" aria-hidden="true" />
        移出待上架
      </button>
    </div>
  );
}
