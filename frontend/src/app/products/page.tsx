'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';

interface Product {
  id: string;
  ozon_product_id: string;
  title: string;
  price_rub: number;
  category_path: string | null;
  images: { url: string; type: string }[];
  is_manual: boolean;
  collected_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (search) params.set('search', search);
      const response = await apiClient.get<Product[]>(`/products?${params}`);
      if (response.success && response.data) setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <div className="max-w-7xl mx-auto px-lg py-xxl">
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-display-md font-display">已采集商品</h1>
        <Link href="/products/new"><Button variant="primary" size="sm">手动添加</Button></Link>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="搜索商品标题..." className="mb-lg" />

      {loading ? (
        <div className="text-center py-xxl text-ink-muted-48">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-xxl text-ink-muted-48">
          暂无采集商品，安装浏览器插件或手动添加
        </div>
      ) : (
        <div className="space-y-md">
          {products.map((p) => (
            <Card key={p.id} variant="light" padding="md">
              <div className="flex items-center gap-lg">
                <div className="w-16 h-16 bg-canvas-parchment rounded-md overflow-hidden flex-shrink-0">
                  {p.images?.[0]?.url && <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body font-medium truncate">{p.title}</h3>
                  <div className="flex items-center gap-md mt-xs">
                    <span className="text-body-sm font-medium">₽{p.price_rub.toLocaleString()}</span>
                    {p.category_path && <span className="text-caption text-ink-muted-48">{p.category_path}</span>}
                    {p.is_manual && <span className="text-caption text-ink-muted-48">手动录入</span>}
                  </div>
                </div>
                <div className="flex gap-sm">
                  <Link href={`/products/${p.id}`}><Button variant="ghost" size="sm">详情</Button></Link>
                  <Link href={`/sourcing?product=${p.id}`}><Button variant="primary" size="sm">1688 比价</Button></Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
