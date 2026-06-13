'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { ProductCard } from '@/components/features/ProductCard';
import { FilterPanel, FilterValues } from '@/components/features/FilterPanel';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';

interface RankingProduct {
  id: string;
  ozon_product_id: string;
  title: string;
  category: string;
  price_rub: number;
  rating: number | null;
  review_count: number;
  sales_trend: string | null;
  rank_type: string;
  rank_position: number;
  image_url: string | null;
  is_selected: boolean;
}

const RANK_TYPES = [
  { value: 'hot', label: '热销榜' },
  { value: 'rising', label: '飙升榜' },
  { value: 'new', label: '新品榜' },
];

export default function RankingsPage() {
  const [category, setCategory] = useState('家居用品');
  const [rankType, setRankType] = useState('hot');
  const [products, setProducts] = useState<RankingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterValues>({ price_min: '', price_max: '', rating_min: '', sales_min: '' });

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, rank_type: rankType, page: String(page), limit: '50' });
      if (filters.price_min) params.set('price_min', filters.price_min);
      if (filters.price_max) params.set('price_max', filters.price_max);
      if (filters.rating_min) params.set('rating_min', filters.rating_min);
      if (filters.sales_min) params.set('sales_min', filters.sales_min);

      const response = await apiClient.get<RankingProduct[]>(`/rankings?${params}`);
      if (response.success && response.data) {
        setProducts(response.data);
        setTotal(response.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch rankings:', err);
    } finally {
      setLoading(false);
    }
  }, [category, rankType, page, filters]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const handleSelect = async (id: string) => {
    try {
      await apiClient.post('/selection-pool', { ranked_product_id: id });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_selected: true } : p))
      );
    } catch (err) {
      console.error('Failed to add to selection pool:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-lg py-xxl">
      <h1 className="text-display-md font-display mb-lg">榜单发现</h1>

      {/* 类目选择器 */}
      <div className="flex gap-md mb-lg overflow-x-auto pb-sm">
        {['家居用品', '服装鞋包', '电子产品', '美容健康', '儿童用品', '运动户外'].map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            className={`px-lg py-sm rounded-pill text-body-sm font-medium whitespace-nowrap transition-all ${
              category === cat ? 'bg-primary text-white' : 'bg-canvas-parchment text-ink hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 榜单类型 Tab */}
      <div className="flex gap-sm mb-lg">
        {RANK_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => { setRankType(t.value); setPage(1); }}
            className={`px-lg py-xs rounded-pill text-body font-medium transition-all ${
              rankType === t.value ? 'bg-ink text-white' : 'bg-canvas-parchment text-ink-muted-48 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 筛选面板 */}
      <FilterPanel onApply={(f) => { setFilters(f); setPage(1); }} className="mb-lg" />

      {/* 商品列表 */}
      {loading ? (
        <div className="text-center py-xxl text-ink-muted-48">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-xxl text-ink-muted-48">暂无数据</div>
      ) : (
        <div className="space-y-md">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {total > 50 && (
        <div className="flex justify-center gap-md mt-xl">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
          <span className="text-body text-ink-muted-48 self-center">第 {page} 页 / 共 {Math.ceil(total / 50)} 页</span>
          <Button variant="ghost" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
