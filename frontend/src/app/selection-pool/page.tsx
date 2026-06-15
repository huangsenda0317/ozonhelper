"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ClipboardList, Trash2 } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card } from "@/components/ui/Card";

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

function ListSkeleton() {
  return (
    <div className="space-y-md animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-lg p-lg rounded-xl border border-hairline bg-surface-card"
        >
          <div className="w-5 h-5 rounded bg-surface-elevated shrink-0" />
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

export default function SelectionPoolPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [items, setItems] = useState<PoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchPool = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (search) params.set("search", search);
      const response = await apiClient.get<PoolItem[]>(
        `/selection-pool?${params}`,
      );
      if (response.success && response.data) {
        setItems(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch selection pool:", err);
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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Failed to remove:", err);
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    try {
      await apiClient.post("/selection-pool/batch-delete", {
        ids: Array.from(selected),
      });
      setItems((prev) => prev.filter((item) => !selected.has(item.id)));
      setSelected(new Set());
    } catch (err) {
      console.error("Failed to batch delete:", err);
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
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between mb-xl">
        <div>
          <p className="eyebrow-cap mb-sm">候选清单</p>
          <div className="flex flex-wrap items-baseline gap-md">
            <h1 className="font-display font-bold text-heading-md text-ink">
              选品{" "}
              <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
                池
              </span>
            </h1>
            {!loading && items.length > 0 && (
              <span
                className={`font-display text-heading-lg ${
                  isDark ? "text-accent-lime" : "text-ink-deep"
                }`}
              >
                {items.length}
                <span className="text-caption text-muted font-text ml-xs">
                  件
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-sm">
          {selected.size > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleBatchDelete}
              className="gap-xs"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              批量移除 ({selected.size})
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/products")}
          >
            去采集商品
          </Button>
        </div>
      </header>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="搜索选品池..."
        className="mb-xl"
      />

      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center">
          <ClipboardList
            className="h-10 w-10 text-accent-violet-mid mx-auto mb-md"
            aria-hidden="true"
          />
          <p className="text-heading-sm text-ink mb-xs">选品池为空</p>
          <p className="text-caption text-muted mb-lg">
            从榜单发现页将商品加入选品池
          </p>
          <Link href="/rankings" className="cursor-pointer inline-block">
            <Button variant="primary" size="sm" className="gap-xs">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              去榜单发现
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-md">
          {items.map((item) => (
            <Card
              key={item.id}
              variant="default"
              padding="md"
              className="transition-colors duration-200 hover:border-hairline-cool dark:hover:border-hairline-violet"
            >
              <div className="flex items-center gap-lg">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={`选择 ${item.title || "商品"}`}
                  className="h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
                />
                <div className="shrink-0 w-16 h-16 bg-surface-elevated rounded-md overflow-hidden border border-hairline">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ClipboardList
                        className="h-5 w-5 text-muted"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body font-medium truncate leading-normal">
                    {item.title || "未知商品"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-md mt-xs">
                    {item.category && (
                      <span className="text-caption text-muted">
                        {item.category}
                      </span>
                    )}
                    {item.price_rub != null && (
                      <span
                        className={`font-display text-heading-sm ${
                          isDark ? "text-on-primary" : "text-ink-deep"
                        }`}
                      >
                        ₽{item.price_rub.toLocaleString()}
                      </span>
                    )}
                    {item.rating != null && (
                      <span className="text-caption text-body">
                        ★ {item.rating}
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-caption text-muted mt-xs line-clamp-2">
                      {item.note}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(item.id)}
                >
                  移除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
