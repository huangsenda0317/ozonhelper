"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { useTheme } from "@/lib/theme-context";
import { ProductCard } from "@/components/features/ProductCard";
import { FilterPanel, FilterValues } from "@/components/features/FilterPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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

const CATEGORIES = [
  "家居用品",
  "服装鞋包",
  "电子产品",
  "美容健康",
  "儿童用品",
  "运动户外",
];

const RANK_TYPES = [
  { value: "hot", label: "热销榜" },
  { value: "rising", label: "飙升榜" },
  { value: "new", label: "新品榜" },
];

function ProductListSkeleton() {
  return (
    <div className="space-y-md animate-pulse" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-lg p-lg rounded-xl border border-hairline bg-surface-card"
        >
          <div className="w-8 h-8 rounded bg-surface-elevated shrink-0" />
          <div className="w-20 h-20 rounded-md bg-surface-elevated shrink-0" />
          <div className="flex-1 space-y-sm py-xs">
            <div className="h-4 w-3/4 rounded bg-surface-elevated" />
            <div className="h-3 w-1/2 rounded bg-surface-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RankingsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [category, setCategory] = useState("家居用品");
  const [rankType, setRankType] = useState("hot");
  const [products, setProducts] = useState<RankingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterValues>({
    price_min: "",
    price_max: "",
    rating_min: "",
    sales_min: "",
  });

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        rank_type: rankType,
        page: String(page),
        limit: "50",
      });
      if (filters.price_min) params.set("price_min", filters.price_min);
      if (filters.price_max) params.set("price_max", filters.price_max);
      if (filters.rating_min) params.set("rating_min", filters.rating_min);
      if (filters.sales_min) params.set("sales_min", filters.sales_min);

      const response = await apiClient.get<RankingProduct[]>(
        `/rankings?${params}`,
      );
      if (response.success && response.data) {
        setProducts(response.data);
        setTotal(response.meta?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch rankings:", err);
    } finally {
      setLoading(false);
    }
  }, [category, rankType, page, filters]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const handleSelect = async (id: string) => {
    try {
      await apiClient.post("/selection-pool", { ranked_product_id: id });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_selected: true } : p)),
      );
    } catch (err) {
      console.error("Failed to add to selection pool:", err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="mb-xl">
        <p className="eyebrow-cap mb-sm">Ozon 排行榜</p>
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display font-bold text-heading-md text-ink">
            榜单{" "}
            <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
              发现
            </span>
          </h1>
          {!loading && total > 0 && (
            <p
              className={`font-display text-heading-lg ${
                isDark ? "text-accent-lime" : "text-ink-deep"
              }`}
            >
              {total.toLocaleString()}{" "}
              <span className="text-caption text-muted font-text">件商品</span>
            </p>
          )}
        </div>
      </header>

      {/* 类目 Tab */}
      <div className="mb-lg">
        <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-sm">
          类目
        </p>
        <div className="flex gap-sm overflow-x-auto pb-xs -mx-xxl px-xxl sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={`category-tab ${
                category === cat ? "category-tab-active" : ""
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 榜单类型 Tab */}
      <div className="mb-xl">
        <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-sm">
          榜单类型
        </p>
        <div className="flex flex-wrap gap-sm">
          {RANK_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setRankType(t.value);
                setPage(1);
              }}
              className={`category-tab ${
                rankType === t.value ? "rank-tab-active" : ""
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <FilterPanel
        onApply={(f) => {
          setFilters(f);
          setPage(1);
        }}
        className="mb-xl"
      />

      {loading ? (
        <ProductListSkeleton />
      ) : products.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center">
          <BarChart3
            className="h-10 w-10 text-accent-violet-mid mx-auto mb-md"
            aria-hidden="true"
          />
          <p className="text-heading-sm text-ink mb-xs">暂无榜单数据</p>
          <p className="text-caption text-muted">
            尝试切换类目、榜单类型或放宽筛选条件
          </p>
        </Card>
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

      {total > 50 && (
        <div className="flex flex-wrap items-center justify-center gap-md mt-xl">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="gap-xs"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            上一页
          </Button>
          <span className="text-body text-muted">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page * 50 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="gap-xs"
          >
            下一页
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
