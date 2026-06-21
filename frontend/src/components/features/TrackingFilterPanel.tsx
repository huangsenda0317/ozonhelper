"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PRODUCT_STATUS_FILTER_OPTIONS } from "@/lib/product-status";

export interface TrackingFilterValues {
  visibility: string;
  status: string;
  has_stock: string;
  sort_by: string;
  sort_order: string;
}

interface TrackingFilterPanelProps {
  onApply: (filters: TrackingFilterValues) => void;
  className?: string;
}

const DEFAULT_FILTERS: TrackingFilterValues = {
  visibility: "ALL",
  status: "",
  has_stock: "",
  sort_by: "updated_at",
  sort_order: "desc",
};

export function TrackingFilterPanel({
  onApply,
  className = "",
}: TrackingFilterPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<TrackingFilterValues>(DEFAULT_FILTERS);

  const handleChange = (key: keyof TrackingFilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
  };

  return (
    <div className={`bg-surface-elevated rounded-lg p-lg ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-sm text-body font-medium w-full"
      >
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        筛选与排序
      </button>

      {expanded && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-md mt-md">
          <div>
            <label className="block text-caption text-muted mb-xxs">
              可见性
            </label>
            <Select
              value={filters.visibility}
              onChange={(value) => handleChange("visibility", String(value))}
              options={[
                { label: "全部", value: "ALL" },
                { label: "可见", value: "VISIBLE" },
                { label: "不可见", value: "INVISIBLE" },
                { label: "已归档", value: "ARCHIVED" },
              ]}
            />
          </div>
          <div>
            <label className="block text-caption text-muted mb-xxs">
              销售状态
            </label>
            <Select
              value={filters.status || undefined}
              onChange={(value) => handleChange("status", value ? String(value) : "")}
              allowClear
              placeholder="全部"
              options={PRODUCT_STATUS_FILTER_OPTIONS.filter((o) => o.value !== "").map((o) => ({
                label: o.label,
                value: o.value,
              }))}
            />
          </div>
          <div>
            <label className="block text-caption text-muted mb-xxs">
              库存
            </label>
            <Select
              value={filters.has_stock || undefined}
              onChange={(value) =>
                handleChange("has_stock", value ? String(value) : "")
              }
              allowClear
              placeholder="不限"
              options={[
                { label: "有库存", value: "true" },
                { label: "无库存", value: "false" },
              ]}
            />
          </div>
          <div>
            <label className="block text-caption text-muted mb-xxs">
              排序字段
            </label>
            <Select
              value={filters.sort_by}
              onChange={(value) => handleChange("sort_by", String(value))}
              options={[
                { label: "更新时间", value: "updated_at" },
                { label: "价格", value: "price" },
                { label: "名称", value: "name" },
              ]}
            />
          </div>
          <div>
            <label className="block text-caption text-muted mb-xxs">
              排序方向
            </label>
            <Select
              value={filters.sort_order}
              onChange={(value) => handleChange("sort_order", String(value))}
              options={[
                { label: "降序", value: "desc" },
                { label: "升序", value: "asc" },
              ]}
            />
          </div>
          <div className="col-span-full flex gap-md mt-sm">
            <Button variant="primary" size="sm" onClick={handleApply}>
              应用筛选
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              重置
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
