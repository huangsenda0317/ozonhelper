"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Package,
  PackageCheck,
  PackageX,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  TrackingFilterPanel,
  TrackingFilterValues,
} from "@/components/features/TrackingFilterPanel";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useStoreContext } from "@/lib/store-context";
import {
  batchProductVisibility,
  fetchTrackingProducts,
  getTrackingErrorMessage,
  TrackingProductSummary,
} from "@/lib/hooks/useTracking";
import { formatSellerPrice, sellerCurrencySuffix, sellerPriceNote } from "@/lib/currency";
import { formatProductStatusName } from "@/lib/product-status";

function StatCard({
  label,
  value,
  highlight = false,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Card
      variant="default"
      padding="md"
      className="transition-colors duration-200"
    >
      <div className="flex items-start justify-between gap-sm">
        <div>
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
        </div>
        <Icon
          className="h-5 w-5 text-accent-violet-mid shrink-0 mt-xxs"
          aria-hidden="true"
        />
      </div>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-sm animate-pulse" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-lg p-md rounded-xl border border-hairline bg-surface-card"
        >
          <div className="w-16 h-16 rounded-md bg-surface-elevated shrink-0" />
          <div className="flex-1 space-y-sm py-xs">
            <div className="h-4 w-2/3 rounded bg-surface-elevated" />
            <div className="h-3 w-1/2 rounded bg-surface-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StockOverviewChart({
  inStock,
  outOfStock,
}: {
  inStock: number;
  outOfStock: number;
}) {
  const total = inStock + outOfStock;
  const inPct = total > 0 ? Math.round((inStock / total) * 100) : 0;
  const outPct = total > 0 ? 100 - inPct : 0;

  return (
    <div className="space-y-lg">
      <p className="text-micro-cap uppercase tracking-[0.25px] text-muted">
        当前页库存分布
      </p>
      <div className="space-y-md">
        <div>
          <div className="flex justify-between text-caption text-body mb-xs">
            <span>有货</span>
            <span>
              {inStock} ({inPct}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full bg-accent-violet rounded-full transition-[width] duration-200"
              style={{ width: `${inPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-caption text-body mb-xs">
            <span>无货</span>
            <span>
              {outOfStock} ({outPct}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full bg-accent-pink rounded-full transition-[width] duration-200"
              style={{ width: `${outPct}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-caption text-muted">销售趋势折线图将在后续版本接入</p>
    </div>
  );
}

export default function TrackingProductsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeStoreId, dataRefreshKey, activeStore } = useStoreContext();
  const settlementCurrency = activeStore?.settlement_currency ?? "RUB";
  const [selected, setSelected] = useState<string[]>([]);
  const [products, setProducts] = useState<TrackingProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<TrackingFilterValues>({
    visibility: "ALL",
    status: "",
    has_stock: "",
    sort_by: "updated_at",
    sort_order: "desc",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    if (!activeStoreId) return;
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const hasStock =
        filters.has_stock === "" ? undefined : filters.has_stock === "true";
      const result = await fetchTrackingProducts({
        store_id: activeStoreId,
        search: debouncedSearch || undefined,
        visibility: filters.visibility,
        status: filters.status || undefined,
        has_stock: hasStock,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
        page,
        limit: 20,
        refresh: forceRefresh,
      });
      setProducts(result.items);
      setTotal(result.total);
      setCachedAt(result.cachedAt);
    } catch (err) {
      setError(getTrackingErrorMessage(err));
      setProducts([]);
      setTotal(0);
      setCachedAt(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, filters, page, activeStoreId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchProducts();
  }, [authLoading, isAuthenticated, fetchProducts, router, activeStoreId, dataRefreshKey]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBatchArchive = async () => {
    if (!activeStoreId || selected.length === 0) return;
    await batchProductVisibility(activeStoreId, selected, "archive");
    setSelected([]);
    fetchProducts(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const pageStats = useMemo(() => {
    const inStock = products.filter((p) => p.stock_present > 0).length;
    return {
      inStock,
      outOfStock: products.length - inStock,
    };
  }, [products]);

  const cachedAtLabel = useMemo(() => {
    if (!cachedAt) return null;
    const date = new Date(cachedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [cachedAt]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md mb-lg">
        <p className="text-body text-body">商品中心 — 搜索、筛选与批量操作</p>
        <div className="flex flex-wrap items-center gap-sm">
          <Link
            href="/tracking/pricing?anomaly=1"
            className="text-caption px-md py-xs rounded-md border border-hairline text-muted hover:text-ink cursor-pointer transition-colors"
          >
            价格异常
          </Link>
          {selected.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleBatchArchive}>
              批量下架 ({selected.length})
            </Button>
          )}
        </div>
      </div>

      {/* KPI row */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
          <StatCard label="商品总数" value={total} highlight icon={Package} />
          <StatCard
            label="当前页有货"
            value={pageStats.inStock}
            icon={PackageCheck}
          />
          <StatCard
            label="当前页无货"
            value={pageStats.outOfStock}
            icon={PackageX}
          />
          <StatCard
            label="当前页"
            value={`${products.length} 件`}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Chart + filters band */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl mb-xl">
        <Card variant="default" padding="lg" className="lg:col-span-5">
          {!loading && products.length > 0 ? (
            <StockOverviewChart
              inStock={pageStats.inStock}
              outOfStock={pageStats.outOfStock}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-lg text-center">
              <TrendingUp
                className="h-8 w-8 text-accent-violet-mid mb-sm"
                aria-hidden="true"
              />
              <p className="text-caption text-muted">加载商品后显示库存分布</p>
            </div>
          )}
        </Card>
        <div className="lg:col-span-7 space-y-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="搜索商品名称或 Offer ID..."
          />
          <TrackingFilterPanel onApply={(values) => setFilters(values)} />
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <Card variant="default" padding="lg" className="text-center">
          <AlertCircle
            className="h-8 w-8 text-accent-pink mx-auto mb-md"
            aria-hidden="true"
          />
          <p className="text-body text-accent-pink mb-lg">{error}</p>
          <Button variant="primary" size="sm" onClick={() => fetchProducts()}>
            重试
          </Button>
        </Card>
      ) : products.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center">
          <Package
            className="h-10 w-10 text-accent-violet-mid mx-auto mb-md"
            aria-hidden="true"
          />
          <p className="text-heading-sm text-ink mb-xs">暂无匹配商品</p>
          <p className="text-caption text-muted">
            尝试调整搜索关键词或筛选条件
          </p>
        </Card>
      ) : (
        <>
          <p className="text-caption text-muted mb-md">{sellerPriceNote(settlementCurrency)}</p>
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-hairline bg-surface-elevated">
                    <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap w-10">
                      选
                    </th>
                    <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap">
                      商品
                    </th>
                    <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap">
                      销量
                    </th>
                    <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap">
                      价格{sellerCurrencySuffix(settlementCurrency)}
                    </th>
                    <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap">
                      库存
                    </th>
                    <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap">
                      状态
                    </th>
                    <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap text-right">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.product_id}
                      className="border-b border-hairline last:border-b-0 hover:bg-surface-elevated/60 transition-colors duration-200"
                    >
                      <td className="px-lg py-md align-middle">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.product_id)}
                          onChange={() => toggleSelect(p.product_id)}
                        />
                      </td>
                      <td className="px-lg py-md align-middle">
                        <div className="flex items-center gap-md min-w-0">
                          <div className="w-12 h-12 bg-surface-elevated rounded-md overflow-hidden shrink-0">
                            {p.primary_image_url ? (
                              <img
                                src={p.primary_image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-micro-cap text-muted">
                                无图
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body font-medium truncate max-w-[240px]">
                              {p.name}
                            </p>
                            <p className="text-caption text-muted truncate">
                              Offer: {p.offer_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-md align-middle text-body whitespace-nowrap">
                        {p.ordered_units}
                      </td>
                      <td className="px-lg py-md align-middle text-body whitespace-nowrap">
                        {formatSellerPrice(p.price, p.currency || settlementCurrency)}
                      </td>
                      <td className="px-lg py-md align-middle text-body whitespace-nowrap">
                        <span
                          className={
                            p.stock_present > 0 ? "text-ink" : "text-muted"
                          }
                        >
                          {p.stock_present}
                        </span>
                      </td>
                      <td className="px-lg py-md align-middle text-caption text-body whitespace-nowrap">
                        {formatProductStatusName(p.status_name)}
                      </td>
                      <td className="px-lg py-md align-middle text-right whitespace-nowrap">
                        <Link
                          href={`/tracking/products/${p.product_id}`}
                          className="cursor-pointer"
                        >
                          <Button variant="ghost" size="sm">
                            详情
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-md mt-xl">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-caption text-muted">
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
