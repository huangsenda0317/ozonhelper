"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  fetchTrackingProductDetail,
  getTrackingErrorMessage,
  TrackingProductDetail,
} from "@/lib/hooks/useTracking";

interface PageProps {
  params: { productId: string };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-sm py-sm border-b border-hairline last:border-0">
      <span className="text-caption text-muted w-28 shrink-0">{label}</span>
      <span className="text-body flex-1 break-all">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-xl animate-pulse"
      aria-hidden="true"
    >
      <div className="rounded-xl border border-hairline bg-surface-card p-lg">
        <div className="aspect-square rounded-md bg-surface-elevated" />
      </div>
      <div className="space-y-lg">
        <div className="h-8 w-3/4 rounded bg-surface-elevated" />
        <div className="h-6 w-1/3 rounded bg-surface-elevated" />
        <div className="rounded-xl border border-hairline p-lg space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-surface-elevated" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Card variant="default" padding="md">
      <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-xs">
        {label}
      </p>
      <p
        className={`font-display text-heading-lg ${
          highlight
            ? isDark
              ? "text-accent-lime"
              : "text-ink-deep"
            : "text-ink"
        }`}
      >
        {value}
      </p>
    </Card>
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
      router.push("/login");
      return;
    }
    fetchDetail();
  }, [authLoading, isAuthenticated, fetchDetail, router]);

  const statusType =
    product?.has_stock === true
      ? "success"
      : product?.has_stock === false
        ? "failed"
        : "pending";

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <div className="mb-xl">
        <Link href="/tracking" className="cursor-pointer inline-block">
          <Button variant="ghost" size="sm" className="gap-xs">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回列表
          </Button>
        </Link>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <Card variant="default" padding="lg" className="text-center max-w-md mx-auto">
          <AlertCircle
            className="h-8 w-8 text-accent-pink mx-auto mb-md"
            aria-hidden="true"
          />
          <p className="text-body text-accent-pink mb-lg">{error}</p>
          <div className="flex flex-wrap justify-center gap-md">
            <Link href="/tracking/products" className="cursor-pointer">
              <Button variant="ghost" size="sm">
                返回列表
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={fetchDetail}>
              重试
            </Button>
          </div>
        </Card>
      ) : product ? (
        <>
          <header className="mb-xl">
            <p className="eyebrow-cap mb-sm">商品详情</p>
            <h1 className="font-display font-bold text-heading-md text-ink mb-md line-clamp-3">
              {product.name}
            </h1>
            <code
              className="inline-block font-mono text-micro-cap text-on-primary bg-surface-night px-sm py-xxs rounded-md"
              title={product.product_id}
            >
              ID {product.product_id}
            </code>
          </header>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
            <DetailStat
              label="售价"
              value={
                product.price != null
                  ? `${product.currency === "RUB" ? "₽" : product.currency}${product.price.toLocaleString()}`
                  : "-"
              }
              highlight
            />
            <DetailStat
              label="可用库存"
              value={product.stock_present}
            />
            <DetailStat
              label="预留库存"
              value={product.stock_reserved}
            />
            <DetailStat
              label="最低价"
              value={
                product.min_price != null
                  ? `₽${product.min_price.toLocaleString()}`
                  : "-"
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
            {/* Image column */}
            <Card variant="default" padding="md" className="lg:col-span-5">
              <div className="aspect-square bg-surface-elevated rounded-md overflow-hidden mb-md">
                {product.primary_image ? (
                  <img
                    src={product.primary_image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-sm">
                    <Package className="h-10 w-10" aria-hidden="true" />
                    <span className="text-caption">暂无图片</span>
                  </div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-sm flex-wrap">
                  {product.images.slice(0, 6).map((url) => (
                    <div
                      key={url}
                      className="w-16 h-16 rounded-md overflow-hidden bg-surface-elevated border border-hairline cursor-pointer hover:border-hairline-cool transition-colors duration-200"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Info column — data-dense cards */}
            <div className="lg:col-span-7 space-y-lg">
              <div className="flex flex-wrap items-center gap-md">
                {product.status_name && (
                  <StatusBadge
                    status={statusType}
                    label={product.status_name}
                  />
                )}
                {product.price != null && product.old_price != null &&
                  product.old_price > 0 && (
                    <span className="text-caption text-muted line-through">
                      ₽{product.old_price.toLocaleString()}
                    </span>
                  )}
              </div>

              <Card variant="default" padding="md">
                <h2 className="text-heading-sm font-display text-ink mb-md">
                  基本信息
                </h2>
                <InfoRow label="Product ID" value={product.product_id} />
                <InfoRow label="Offer ID" value={product.offer_id} />
                <InfoRow label="SKU" value={product.sku} />
                <InfoRow label="条码" value={product.barcode} />
                <InfoRow label="状态说明" value={product.status_description} />
                <InfoRow label="审核状态" value={product.moderate_status} />
                <InfoRow label="验证状态" value={product.validation_status} />
              </Card>

              <Card variant="default" padding="md">
                <h2 className="text-heading-sm font-display text-ink mb-md">
                  价格与库存
                </h2>
                <InfoRow
                  label="是否有货"
                  value={product.has_stock ? "是" : "否"}
                />
                <InfoRow label="可用库存" value={product.stock_present} />
                <InfoRow label="预留库存" value={product.stock_reserved} />
              </Card>

              {(product.updated_at || product.created_at) && (
                <Card variant="default" padding="md">
                  <h2 className="text-heading-sm font-display text-ink mb-md">
                    时间
                  </h2>
                  <InfoRow label="创建时间" value={product.created_at} />
                  <InfoRow label="更新时间" value={product.updated_at} />
                </Card>
              )}

              {product.ozon_url && (
                <a
                  href={product.ozon_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer inline-block"
                >
                  <Button variant="primary" size="sm" className="gap-xs">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    在 Ozon 查看
                  </Button>
                </a>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
