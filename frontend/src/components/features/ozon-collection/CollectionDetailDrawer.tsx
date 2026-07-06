"use client";

import React from "react";
import { Drawer } from "antd";

import { CollectionProductCell } from "@/components/features/ozon-collection/CollectionProductCell";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from "@/lib/ozon-rankings/format";
import type { CollectionItem } from "@/lib/ozon-collection/types";

interface CollectionDetailDrawerProps {
  item: CollectionItem | null;
  open: boolean;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-md py-sm border-b border-hairline last:border-0">
      <span className="text-caption text-muted w-28 shrink-0">{label}</span>
      <span className="text-body text-ink flex-1">{value ?? "—"}</span>
    </div>
  );
}

export function CollectionDetailDrawer({
  item,
  open,
  onClose,
}: CollectionDetailDrawerProps) {
  return (
    <Drawer
      title="采集详情"
      open={open}
      onClose={onClose}
      width={480}
      destroyOnClose
    >
      {item && (
        <div className="space-y-lg">
          <CollectionProductCell item={item} />

          <section>
            <h3 className="text-body font-medium text-ink mb-sm">商品基本信息</h3>
            <div className="rounded-lg border border-hairline bg-surface-elevated/30 px-md">
              <DetailRow label="商品 ID" value={item.sku} />
              <DetailRow label="品牌" value={item.brand} />
              <DetailRow label="卖家" value={item.seller_name} />
              <DetailRow label="平台商品 ID" value={item.sku} />
              <DetailRow
                label="来源状态"
                value={item.source_platform === "OZON" ? "OZON采集" : "1688找货"}
              />
              <DetailRow label="类目" value={item.category_path_zh} />
            </div>
          </section>

          <section>
            <h3 className="text-body font-medium text-ink mb-sm">指标</h3>
            <div className="rounded-lg border border-hairline bg-surface-elevated/30 px-md">
              <DetailRow label="当前价格" value={formatCurrency(item.current_price)} />
              <DetailRow
                label="跟卖数"
                value={formatNumber(item.competitor_count)}
              />
              <DetailRow
                label="评分"
                value={item.rating != null ? item.rating.toFixed(1) : "—"}
              />
              <DetailRow label="评论数" value={formatNumber(item.review_count)} />
              <DetailRow label="销量" value={formatNumber(item.sold_count)} />
              <DetailRow label="最近采集" value={formatDateTime(item.collected_at)} />
            </div>
          </section>

          {item.tags.length > 0 && (
            <section>
              <h3 className="text-body font-medium text-ink mb-sm">采集标签</h3>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-caption bg-surface-elevated text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-body font-medium text-ink mb-sm">商品图集</h3>
            <div className="rounded-lg border border-dashed border-hairline p-lg text-center text-caption text-muted">
              {item.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photo_url}
                  alt=""
                  className="mx-auto h-32 w-32 rounded object-cover"
                />
              ) : (
                "主图与详情图（开发中）"
              )}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
