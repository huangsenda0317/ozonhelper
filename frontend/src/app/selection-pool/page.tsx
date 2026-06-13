'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Card } from '@/components/ui/Card';

interface PoolItem {
  id: string;
  ranked_product_id: string;
  note: string | null;
  added_at: string;
  ozon_product_id: string | null;
  title: string | null;
  category: string | null;
  price_rub: number | null;
  rating: number | null;
  image_url: string | null;
}

export default function SelectionPoolPage() {
  const [items, setItems] = useState<PoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchPool = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (search) params.set('search', search);
      const response = await apiClient.get<PoolItem[]>(`/selection-pool?${params}`);
      if (response.success && response.data) {
        setItems(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch selection pool:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  const handleRemove = async (id: string) => {
    try {
      await apiClient.delete(`/selection-pool/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    try {
      await apiClient.post('/selection-pool/batch-delete', { ids: Array.from(selected) });
      setItems((prev) => prev.filter((item) => !selected.has(item.id)));
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to batch delete:', err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-lg py-xxl">
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-display-md font-display">选品池</h1>
        <div className="flex gap-md">
          {selected.size > 0 && (
            <Button variant="danger" size="sm" onClick={handleBatchDelete}>
              批量移除 ({selected.size})
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => router.push('/products')}>
            去采集商品
          </Button>
        </div>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="搜索选品池..." className="mb-lg" />

      {loading ? (
        <div className="text-center py-xxl text-ink-muted-48">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-xxl text-ink-muted-48">
          选品池为空，去「榜单发现」选择商品吧
        </div>
      ) : (
        <div className="space-y-md">
          {items.map((item) => (
            <Card key={item.id} variant="light" padding="md">
              <div className="flex items-center gap-lg">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="h-5 w-5 rounded accent-primary"
                />
                <div className="flex-shrink-0 w-16 h-16 bg-canvas-parchment rounded-md overflow-hidden">
                  {item.image_url && <img src={item.image_url} alt={item.title || ''} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body font-medium truncate">{item.title || '未知商品'}</h3>
                  <div className="flex items-center gap-md mt-xs">
                    <span className="text-caption text-ink-muted-48">{item.category}</span>
                    {item.price_rub && <span className="text-body-sm font-medium">₽{item.price_rub.toLocaleString()}</span>}
                    {item.rating && <span className="text-caption text-ink-muted-48">★ {item.rating}</span>}
                  </div>
                  {item.note && <p className="text-caption text-ink-muted-48 mt-xs">{item.note}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(item.id)}>移除</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
