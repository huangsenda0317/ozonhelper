"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  COLLECTED_TIME_OPTIONS,
  PROCESSING_STATUS_OPTIONS,
  SOURCE_PLATFORM_OPTIONS,
  type CollectionFilters,
} from "@/lib/ozon-collection/types";

interface CollectionFilterBarProps {
  filters: CollectionFilters;
  onChange: (filters: CollectionFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

const FILTER_FIELD_CLASS = "w-full filter-field-sentry";
const FILTER_ACTION_CLASS = "flex-1 md:flex-none gap-1 px-3 shadow-none";
const FILTER_ACTION_ICON_CLASS = "h-3 w-3 shrink-0";

export function CollectionFilterBar({
  filters,
  onChange,
  onSearch,
  onReset,
}: CollectionFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const fields = (
    <>
      <div className="flex flex-col gap-xs flex-1 min-w-[10rem]">
        <label className="text-caption text-muted">关键词</label>
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          placeholder="商品名 / SKU / 采集名称"
          className={`input-sentry ${FILTER_FIELD_CLASS}`}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[8rem]">
        <label className="text-caption text-muted">采集时间</label>
        <Select
          value={filters.collected_time === "all" ? undefined : filters.collected_time}
          onChange={(v) =>
            onChange({
              ...filters,
              collected_time: (v != null ? String(v) : "all") as CollectionFilters["collected_time"],
            })
          }
          options={COLLECTED_TIME_OPTIONS.filter((o) => o.value !== "all")}
          placeholder="全部"
          allowClear
          className={FILTER_FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[7rem]">
        <label className="text-caption text-muted">来源平台</label>
        <Select
          value={filters.source_platform}
          onChange={(v) =>
            onChange({
              ...filters,
              source_platform: (v != null ? String(v) : "all") as CollectionFilters["source_platform"],
            })
          }
          options={SOURCE_PLATFORM_OPTIONS}
          className={FILTER_FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[7rem]">
        <label className="text-caption text-muted">加工状态</label>
        <Select
          value={filters.processing_status}
          onChange={(v) =>
            onChange({
              ...filters,
              processing_status: (v != null ? String(v) : "all") as CollectionFilters["processing_status"],
            })
          }
          options={PROCESSING_STATUS_OPTIONS}
          className={FILTER_FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-xs shrink-0 w-full md:w-auto">
        <span
          className="text-caption text-transparent select-none pointer-events-none hidden md:block"
          aria-hidden="true"
        >
          操作
        </span>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="ghost"
            size="xs"
            onClick={onReset}
            className={`${FILTER_ACTION_CLASS} text-muted hover:text-ink`}
          >
            <RotateCcw
              className={`${FILTER_ACTION_ICON_CLASS} opacity-60`}
              strokeWidth={2}
              aria-hidden="true"
            />
            重置
          </Button>
          <Button
            variant="primary"
            size="xs"
            onClick={onSearch}
            className={FILTER_ACTION_CLASS}
          >
            <Search
              className={FILTER_ACTION_ICON_CLASS}
              strokeWidth={2}
              aria-hidden="true"
            />
            查询
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-md">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full items-center justify-between text-body font-medium cursor-pointer transition-colors duration-200"
          aria-expanded={mobileOpen}
        >
          筛选条件
          {mobileOpen ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        {mobileOpen && (
          <div className="mt-md flex flex-col gap-md">{fields}</div>
        )}
      </div>
      <div className="hidden md:flex md:flex-wrap md:items-end md:gap-md">
        {fields}
      </div>
    </div>
  );
}
