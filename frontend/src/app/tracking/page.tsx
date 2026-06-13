'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  TrackingFilterPanel,
  TrackingFilterValues,
} from '@/components/features/TrackingFilterPanel';
import { useAuth } from '@/lib/auth-context';
import {
  fetchTrackingProducts,
  getTrackingErrorMessage,
  TrackingProductSummary,
} from '@/lib/hooks/useTracking';

export default function TrackingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<TrackingProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<TrackingFilterValues>({
    visibility: 'ALL',
    status: '',
    has_stock: '',
    sort_by: 'updated_at',
    sort_order: 'desc',
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hasStock =
        filters.has_stock === ''
          ? undefined
          : filters.has_stock === 'true';
      const result = await fetchTrackingProducts({
        search: debouncedSearch || undefined,
        visibility: filters.visibility,
        status: filters.status || undefined,
        has_stock: hasStock,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
        page,
        limit: 20,
      });
      setProducts(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(getTrackingErrorMessage(err));
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProducts();
  }, [authLoading, isAuthenticated, fetchProducts, router]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="max-w-7xl mx-auto px-lg py-xxl">
      <h1 className="text-display-md font-display mb-lg">店铺跟踪</h1>
      <p className="text-body-sm text-ink-muted-48 mb-lg">
        查看 Ozon 店铺已上架商品，支持搜索与筛选
      </p>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="搜索商品名称或 Offer ID..."
        className="mb-md"
      />

      <TrackingFilterPanel
        className="mb-lg"
        onApply={(values) => setFilters(values)}
      />

      {loading ? (
        <div className="text-center py-xxl text-ink-muted-48">加载中...</div>
      ) : error ? (
        <div className="text-center py-xxl">
          <p className="text-body text-red-600 mb-md">{error}</p>
          <Button variant="primary" size="sm" onClick={fetchProducts}>
            重试
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-xxl text-ink-muted-48">
          暂无匹配商品
        </div>
      ) : (
        <>
          <div className="space-y-md">
            {products.map((p) => (
              <Card key={p.product_id} variant="light" padding="md">
                <div className="flex items-center gap-lg">
                  <div className="w-16 h-16 bg-canvas-parchment rounded-md overflow-hidden flex-shrink-0">
                    {p.primary_image_url ? (
                      <img
                        src={p.primary_image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-caption text-ink-muted-48">
                        无图
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body font-medium truncate">{p.name}</h3>
                    <div className="flex flex-wrap items-center gap-md mt-xs">
                      {p.price != null && (
                        <span className="text-body-sm font-medium">
                          {p.currency === 'RUB' ? '₽' : p.currency}
                          {p.price.toLocaleString()}
                        </span>
                      )}
                      <span className="text-caption text-ink-muted-48">
                        库存 {p.stock_present}
                      </span>
                      {p.status_name && (
                        <span className="text-caption text-ink-muted-48">
                          {p.status_name}
                        </span>
                      )}
                      <span className="text-caption text-ink-muted-48">
                        Offer: {p.offer_id}
                      </span>
                    </div>
                  </div>
                  <Link href={`/tracking/${p.product_id}`}>
                    <Button variant="ghost" size="sm">
                      详情
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-md mt-lg">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-body-sm text-ink-muted-48">
                {page} / {totalPages}（共 {total} 件）
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
