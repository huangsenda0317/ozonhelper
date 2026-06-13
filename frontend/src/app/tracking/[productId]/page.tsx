'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth-context';
import {
  fetchTrackingProductDetail,
  getTrackingErrorMessage,
  TrackingProductDetail,
} from '@/lib/hooks/useTracking';

interface PageProps {
  params: { productId: string };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-sm py-xs border-b border-gray-100 last:border-0">
      <span className="text-caption text-ink-muted-48 w-28 flex-shrink-0">{label}</span>
      <span className="text-body-sm flex-1 break-all">{value}</span>
    </div>
  );
}

export default function TrackingProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [product, setProduct] = useState<TrackingProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrackingProductDetail(params.productId);
      setProduct(data);
    } catch (err) {
      setError(getTrackingErrorMessage(err));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [params.productId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchDetail();
  }, [authLoading, isAuthenticated, fetchDetail, router]);

  return (
    <div className="max-w-5xl mx-auto px-lg py-xxl">
      <div className="mb-lg">
        <Link href="/tracking">
          <Button variant="ghost" size="sm">
            ← 返回列表
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-xxl text-ink-muted-48">加载中...</div>
      ) : error ? (
        <div className="text-center py-xxl">
          <p className="text-body text-red-600 mb-md">{error}</p>
          <div className="flex justify-center gap-md">
            <Link href="/tracking">
              <Button variant="ghost" size="sm">
                返回列表
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={fetchDetail}>
              重试
            </Button>
          </div>
        </div>
      ) : product ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
          <Card variant="light" padding="md">
            <div className="aspect-square bg-canvas-parchment rounded-md overflow-hidden mb-md">
              {product.primary_image ? (
                <img
                  src={product.primary_image}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-muted-48">
                  暂无图片
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-sm flex-wrap">
                {product.images.slice(0, 6).map((url) => (
                  <div
                    key={url}
                    className="w-16 h-16 rounded-md overflow-hidden bg-canvas-parchment"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-lg">
            <div>
              <h1 className="text-display-sm font-display mb-sm">{product.name}</h1>
              {product.price != null && (
                <p className="text-title font-medium">
                  {product.currency === 'RUB' ? '₽' : product.currency}
                  {product.price.toLocaleString()}
                  {product.old_price != null && product.old_price > 0 && (
                    <span className="text-body-sm text-ink-muted-48 line-through ml-sm">
                      ₽{product.old_price.toLocaleString()}
                    </span>
                  )}
                </p>
              )}
            </div>

            <Card variant="light" padding="md">
              <h2 className="text-body font-medium mb-md">基本信息</h2>
              <InfoRow label="Product ID" value={product.product_id} />
              <InfoRow label="Offer ID" value={product.offer_id} />
              <InfoRow label="SKU" value={product.sku} />
              <InfoRow label="条码" value={product.barcode} />
              <InfoRow label="状态" value={product.status_name} />
              <InfoRow label="状态说明" value={product.status_description} />
              <InfoRow label="审核状态" value={product.moderate_status} />
              <InfoRow label="验证状态" value={product.validation_status} />
            </Card>

            <Card variant="light" padding="md">
              <h2 className="text-body font-medium mb-md">价格与库存</h2>
              <InfoRow
                label="最低价"
                value={
                  product.min_price != null
                    ? `₽${product.min_price.toLocaleString()}`
                    : null
                }
              />
              <InfoRow label="可用库存" value={product.stock_present} />
              <InfoRow label="预留库存" value={product.stock_reserved} />
              <InfoRow label="是否有货" value={product.has_stock ? '是' : '否'} />
            </Card>

            {(product.updated_at || product.created_at) && (
              <Card variant="light" padding="md">
                <h2 className="text-body font-medium mb-md">时间</h2>
                <InfoRow label="创建时间" value={product.created_at} />
                <InfoRow label="更新时间" value={product.updated_at} />
              </Card>
            )}

            {product.ozon_url && (
              <a href={product.ozon_url} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="sm">
                  在 Ozon 查看
                </Button>
              </a>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
