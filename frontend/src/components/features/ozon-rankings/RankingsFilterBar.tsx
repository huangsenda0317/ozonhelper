"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CategoryCascader } from "@/components/features/ozon-rankings/CategoryCascader";
import {
  SALES_SCHEMA_OPTIONS,
  SORT_OPTIONS,
  type RankingFilters,
} from "@/lib/ozon-rankings/types";

interface RankingsFilterBarProps {
  filters: RankingFilters;
  onChange: (filters: RankingFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

/** 筛选栏控件统一尺寸与边框（与 globals.css `.filter-field-sentry` 配套） */
const FILTER_FIELD_CLASS = "w-full filter-field-sentry";

/** 筛选栏操作按钮 — 与 filter-field-sentry 同高，图标 12px */
const FILTER_ACTION_CLASS = "flex-1 md:flex-none gap-1 px-3 shadow-none";
const FILTER_ACTION_ICON_CLASS = "h-3 w-3 shrink-0";

export function RankingsFilterBar({
  filters,
  onChange,
  onSearch,
  onReset,
}: RankingsFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const fields = (
    <>
      <div className="flex flex-col gap-xs min-w-[8rem]">
        <label className="text-caption text-muted">排序口径</label>
        <Select
          value={filters.sort_key}
          onChange={(v) =>
            onChange({
              ...filters,
              sort_key: v != null ? String(v) : "sum_gmv_desc",
            })
          }
          options={SORT_OPTIONS}
          className={FILTER_FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-xs flex-1 min-w-[10rem]">
        <label className="text-caption text-muted">关键词</label>
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          placeholder="商品名 / SKU / 品牌"
          className={`input-sentry ${FILTER_FIELD_CLASS}`}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[12rem]">
        <label className="text-caption text-muted">类目筛选</label>
        <CategoryCascader
          sortKey={filters.sort_key}
          value={filters.category}
          onChange={(category) => onChange({ ...filters, category })}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[7rem]">
        <label className="text-caption text-muted">发货方式</label>
        <Select
          value={filters.sales_schema}
          onChange={(v) =>
            onChange({ ...filters, sales_schema: v != null ? String(v) : "" })
          }
          options={SALES_SCHEMA_OPTIONS}
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
          className="flex w-full items-center justify-between text-body font-medium cursor-pointer"
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
