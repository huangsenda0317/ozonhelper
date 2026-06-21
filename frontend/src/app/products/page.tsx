"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Package, Plus } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatRubPrice } from "@/lib/currency";

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

function ListSkeleton() {
  return (
    <div className="space-y-md animate-pulse" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-lg p-lg rounded-xl border border-hairline bg-surface-card"
        >
          <div className="w-16 h-16 rounded-md bg-surface-elevated shrink-0" />
          <div className="flex-1 space-y-sm py-xs">
            <div className="h-4 w-3/4 rounded bg-surface-elevated" />
            <div className="h-3 w-1/3 rounded bg-surface-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (search) params.set("search", search);
      const response = await apiClient.get<Product[]>(`/products?${params}`);
      if (response.success && response.data) setProducts(response.data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between mb-xl">
        <div>
          <p className="eyebrow-cap mb-sm">采集库</p>
          <h1 className="font-display font-bold text-heading-md text-ink">
            已采集{" "}
            <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
              商品
            </span>
          </h1>
          {!loading && products.length > 0 && (
            <p className="text-caption text-body mt-xs">
              共 {products.length} 条（当前页）
            </p>
          )}
        </div>
        <Link href="/products/new" className="cursor-pointer shrink-0">
          <Button variant="primary" size="sm" className="gap-xs">
            <Plus className="h-4 w-4" aria-hidden="true" />
            手动添加
          </Button>
        </Link>
      </header>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="搜索商品标题..."
        className="mb-xl"
      />

      {loading ? (
        <ListSkeleton />
      ) : products.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center">
          <Package
            className="h-10 w-10 text-accent-violet-mid mx-auto mb-md"
            aria-hidden="true"
          />
          <p className="text-heading-sm text-ink mb-xs">暂无采集商品</p>
          <p className="text-caption text-muted mb-lg">
            安装浏览器插件采集，或手动添加商品
          </p>
          <Link href="/products/new" className="cursor-pointer inline-block">
            <Button variant="primary" size="sm">
              手动添加
            </Button>
          </Link>
        </Card>
      ) : (
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-hairline bg-surface-elevated">
                  <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted">
                    商品
                  </th>
                  <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted whitespace-nowrap">
                    价格
                  </th>
                  <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted">
                    类目
                  </th>
                  <th className="px-lg py-md text-micro-cap uppercase tracking-[0.25px] text-muted text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-hairline last:border-b-0 hover:bg-surface-elevated/60 transition-colors duration-200"
                  >
                    <td className="px-lg py-md align-middle">
                      <div className="flex items-center gap-md min-w-0">
                        <div className="w-12 h-12 bg-surface-elevated rounded-md overflow-hidden shrink-0">
                          {p.images?.[0]?.url ? (
                            <img
                              src={p.images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package
                                className="h-4 w-4 text-muted"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-body font-medium truncate max-w-[280px]">
                            {p.title}
                          </p>
                          {p.is_manual && (
                            <span className="text-micro-cap text-muted uppercase tracking-[0.25px]">
                              手动录入
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-md align-middle whitespace-nowrap">
                      <span
                        className={`font-display text-heading-sm ${
                          isDark ? "text-on-primary" : "text-ink-deep"
                        }`}
                      >
                        {formatRubPrice(p.price_rub)}
                      </span>
                    </td>
                    <td className="px-lg py-md align-middle text-caption text-body max-w-[160px] truncate">
                      {p.category_path || "-"}
                    </td>
                    <td className="px-lg py-md align-middle text-right whitespace-nowrap">
                      <div className="flex justify-end gap-xs">
                        <Link
                          href={`/products/${p.id}`}
                          className="cursor-pointer"
                        >
                          <Button variant="ghost" size="sm">
                            详情
                          </Button>
                        </Link>
                        <Link
                          href={`/sourcing?product=${p.id}`}
                          className="cursor-pointer"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-xs"
                          >
                            <Coins
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            1688
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
