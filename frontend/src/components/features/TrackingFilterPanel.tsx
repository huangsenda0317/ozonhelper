'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';

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
  visibility: 'ALL',
  status: '',
  has_stock: '',
  sort_by: 'updated_at',
  sort_order: 'desc',
};

export function TrackingFilterPanel({ onApply, className = '' }: TrackingFilterPanelProps) {
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
    <div className={`bg-canvas-parchment rounded-lg p-lg ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-sm text-body font-medium w-full"
      >
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        筛选与排序
      </button>

      {expanded && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-md mt-md">
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">可见性</label>
            <select
              value={filters.visibility}
              onChange={(e) => handleChange('visibility', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
            >
              <option value="ALL">全部</option>
              <option value="VISIBLE">可见</option>
              <option value="INVISIBLE">不可见</option>
              <option value="ARCHIVED">已归档</option>
            </select>
          </div>
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">销售状态</label>
            <input
              type="text"
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
              placeholder="如：Продается / 在售"
            />
          </div>
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">库存</label>
            <select
              value={filters.has_stock}
              onChange={(e) => handleChange('has_stock', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
            >
              <option value="">不限</option>
              <option value="true">有库存</option>
              <option value="false">无库存</option>
            </select>
          </div>
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">排序字段</label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleChange('sort_by', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
            >
              <option value="updated_at">更新时间</option>
              <option value="price">价格</option>
              <option value="name">名称</option>
            </select>
          </div>
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">排序方向</label>
            <select
              value={filters.sort_order}
              onChange={(e) => handleChange('sort_order', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
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
