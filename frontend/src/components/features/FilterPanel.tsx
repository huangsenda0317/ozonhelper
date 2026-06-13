'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';

interface FilterPanelProps {
  onApply: (filters: FilterValues) => void;
  className?: string;
}

export interface FilterValues {
  price_min: string;
  price_max: string;
  rating_min: string;
  sales_min: string;
}

export function FilterPanel({ onApply, className = '' }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    price_min: '',
    price_max: '',
    rating_min: '',
    sales_min: '',
  });

  const handleChange = (key: keyof FilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  const handleReset = () => {
    const empty = { price_min: '', price_max: '', rating_min: '', sales_min: '' };
    setFilters(empty);
    onApply(empty);
  };

  return (
    <div className={`bg-canvas-parchment rounded-lg p-lg ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-sm text-body font-medium w-full"
      >
        <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        筛选条件
      </button>

      {expanded && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mt-md">
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">最低价格 (₽)</label>
            <input
              type="number"
              value={filters.price_min}
              onChange={(e) => handleChange('price_min', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">最高价格 (₽)</label>
            <input
              type="number"
              value={filters.price_max}
              onChange={(e) => handleChange('price_max', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
              placeholder="99999"
            />
          </div>
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">最低评分</label>
            <select
              value={filters.rating_min}
              onChange={(e) => handleChange('rating_min', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
            >
              <option value="">不限</option>
              <option value="4.5">4.5+</option>
              <option value="4.0">4.0+</option>
              <option value="3.5">3.5+</option>
            </select>
          </div>
          <div>
            <label className="block text-caption text-ink-muted-48 mb-xxs">最低评价数</label>
            <input
              type="number"
              value={filters.sales_min}
              onChange={(e) => handleChange('sales_min', e.target.value)}
              className="w-full px-sm py-xs text-body-sm border border-gray-200 rounded-md"
              placeholder="0"
            />
          </div>
          <div className="col-span-full flex gap-md mt-sm">
            <Button variant="primary" size="sm" onClick={handleApply}>应用筛选</Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>重置</Button>
          </div>
        </div>
      )}
    </div>
  );
}
