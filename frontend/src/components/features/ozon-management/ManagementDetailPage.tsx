"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { formatCurrency, formatDateTime, formatNumber } from "@/lib/ozon-rankings/format";
import { useManagement } from "@/lib/ozon-management/management-context";

interface ManagementDetailPageProps {
  itemId: string;
}

export function ManagementDetailPage({ itemId }: ManagementDetailPageProps) {
  const { getItemById } = useManagement();
  const item = getItemById(itemId);

  if (!item) {
    return (
      <div className="space-y-md">
        <p className="text-muted">商品不存在或已移出</p>
        <Link href="/ozon-assistant/management" className="text-accent-violet-mid hover:underline">
          返回待上架
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-lg pb-xxl">
      <nav className="flex items-center gap-sm text-caption text-muted">
        <Link
          href="/ozon-assistant/management"
          className="inline-flex items-center gap-xs hover:text-ink transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          待上架商品
        </Link>
        <span>/</span>
        <span className="text-ink">详情</span>
      </nav>

      <header className="flex flex-col sm:flex-row sm:items-start gap-md">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo_url}
            alt=""
            className="h-32 w-32 rounded-xl object-cover bg-surface-elevated shrink-0"
          />
        ) : (
          <div className="h-32 w-32 rounded-xl bg-surface-elevated shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-heading-sm font-display text-ink mb-xs">{item.title_zh}</h1>
          <p className="text-caption text-muted">SKU: {item.sku}</p>
          <p className="text-body font-medium mt-sm">{formatCurrency(item.current_price)}</p>
        </div>
      </header>

      <Link
        href="/ozon-assistant/management"
        className="inline-flex items-center gap-xs px-md py-sm text-caption rounded-md interactive-muted-soft cursor-pointer transition-colors duration-200"
      >
        返回待上架
      </Link>

      <div className="grid gap-md md:grid-cols-2">
        <section className="rounded-xl border border-hairline bg-surface-card p-lg space-y-sm">
          <h2 className="text-body font-medium text-ink">基本信息</h2>
          <dl className="text-caption space-y-2">
            <div className="flex justify-between gap-md">
              <dt className="text-muted">品牌</dt>
              <dd>{item.brand || "—"}</dd>
            </div>
            <div className="flex justify-between gap-md">
              <dt className="text-muted">类目</dt>
              <dd className="text-right">{item.category_path_zh || "—"}</dd>
            </div>
            <div className="flex justify-between gap-md">
              <dt className="text-muted">来源状态</dt>
              <dd>{item.source_status === "processed" ? "已加工" : "已采集"}</dd>
            </div>
            <div className="flex justify-between gap-md">
              <dt className="text-muted">关联店铺</dt>
              <dd>{item.shop_name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-md">
              <dt className="text-muted">加入待上架</dt>
              <dd>{formatDateTime(item.joined_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-hairline bg-surface-card p-lg space-y-sm">
          <h2 className="text-body font-medium text-ink">指标（mock）</h2>
          <dl className="text-caption space-y-2">
            <div className="flex justify-between gap-md">
              <dt className="text-muted">库存</dt>
              <dd>{item.stock != null ? formatNumber(item.stock) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-md">
              <dt className="text-muted">详情页浏览量</dt>
              <dd>{item.page_views != null ? formatNumber(item.page_views) : "—"}</dd>
            </div>
          </dl>
        </section>
      </div>

      {item.tags.length > 0 && (
        <section className="rounded-xl border border-hairline bg-surface-card p-lg">
          <h2 className="text-body font-medium text-ink mb-sm">采集标签</h2>
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex px-2 py-0.5 rounded text-caption bg-surface-elevated text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {item.description_zh && (
        <section className="rounded-xl border border-hairline bg-surface-card p-lg">
          <h2 className="text-body font-medium text-ink mb-sm">商品描述（中文）</h2>
          <p className="text-caption text-muted whitespace-pre-wrap">{item.description_zh}</p>
        </section>
      )}
    </div>
  );
}
