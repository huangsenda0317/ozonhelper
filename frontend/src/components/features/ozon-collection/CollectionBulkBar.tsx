"use client";

import React from "react";
import { Trash2, Wrench } from "lucide-react";

interface CollectionBulkBarProps {
  selectedCount: number;
  onBatchProcess: () => void;
  onBatchDelete: () => void;
}

export function CollectionBulkBar({
  selectedCount,
  onBatchProcess,
  onBatchDelete,
}: CollectionBulkBarProps) {
  const disabled = selectedCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-sm">
      <span className="text-caption text-muted">
        {selectedCount > 0 ? `已选 ${selectedCount} 项` : "请选择商品进行操作"}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onBatchProcess}
        className="bulk-action-btn bulk-action-btn--violet"
      >
        <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
        批量加工
      </button>
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
