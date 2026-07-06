"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  LISTING_TIME_OPTIONS,
  MOCK_SHOP_OPTIONS,
  SOURCE_STATUS_OPTIONS,
  type ListingFilters,
} from "@/lib/ozon-management/types";

interface ManagementFilterBarProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

const FILTER_FIELD_CLASS = "w-full filter-field-sentry";
const FILTER_ACTION_CLASS = "flex-1 md:flex-none gap-1 px-3 shadow-none";
const FILTER_ACTION_ICON_CLASS = "h-3 w-3 shrink-0";

export function ManagementFilterBar({
  filters,
  onChange,
  onSearch,
  onReset,
}: ManagementFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const fields = (
    <>
      <div className="flex flex-col gap-xs flex-1 min-w-[10rem]">
        <label htmlFor="mgmt-keyword" className="text-caption text-muted">
          关键词
        </label>
        <input
          id="mgmt-keyword"
          type="text"
          value={filters.keyword}
          onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          placeholder="搜索商品标题"
          className={`input-sentry ${FILTER_FIELD_CLASS}`}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[7rem]">
        <label className="text-caption text-muted">来源状态</label>
        <Select
          value={filters.source_status}
          onChange={(v) =>
            onChange({
              ...filters,
              source_status: (v != null ? String(v) : "all") as ListingFilters["source_status"],
            })
          }
          options={SOURCE_STATUS_OPTIONS}
          className={FILTER_FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[8rem]">
        <label className="text-caption text-muted">关联店铺</label>
        <Select
          value={filters.shop_id}
          onChange={(v) =>
            onChange({
              ...filters,
              shop_id: v != null ? String(v) : "all",
            })
          }
          options={MOCK_SHOP_OPTIONS}
          className={FILTER_FIELD_CLASS}
        />
      </div>
      <div className="flex flex-col gap-xs min-w-[8rem]">
        <label className="text-caption text-muted">加入时间</label>
        <Select
          value={filters.joined_time === "all" ? undefined : filters.joined_time}
          onChange={(v) =>
            onChange({
              ...filters,
              joined_time: (v != null ? String(v) : "all") as ListingFilters["joined_time"],
            })
          }
          options={LISTING_TIME_OPTIONS.filter((o) => o.value !== "all")}
          placeholder="全部"
          allowClear
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
            <RotateCcw className={`${FILTER_ACTION_ICON_CLASS} opacity-60`} aria-hidden="true" />
            重置
          </Button>
          <Button variant="primary" size="xs" onClick={onSearch} className={FILTER_ACTION_CLASS}>
            <Search className={FILTER_ACTION_ICON_CLASS} aria-hidden="true" />
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
        {mobileOpen && <div className="mt-md flex flex-col gap-md">{fields}</div>}
      </div>
      <div className="hidden md:flex md:flex-wrap md:items-end md:gap-md">{fields}</div>
    </div>
  );
}
