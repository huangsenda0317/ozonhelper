"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { Drawer } from "antd";

import { CollectionProductCell } from "@/components/features/ozon-collection/CollectionProductCell";
import { formatCurrency } from "@/lib/ozon-rankings/format";
import type { CollectionItem } from "@/lib/ozon-collection/types";

interface CollectionCompareDrawerProps {
  item: CollectionItem | null;
  open: boolean;
  onClose: () => void;
}

const MOCK_1688_CANDIDATES = [
  {
    title: "斯维托复印纸，5张A4规格，500页，用于打印机",
    price: 45.8,
    shop: "义乌文具批发",
  },
  {
    title: "A4复印纸 500张/包 办公打印纸",
    price: 52.0,
    shop: "杭州纸业直销",
  },
];

export function CollectionCompareDrawer({
  item,
  open,
  onClose,
}: CollectionCompareDrawerProps) {
  const hasCompare = item?.source_platform === "1688" || item?.tags.includes("1688");

  return (
    <Drawer
      title="1688 比价"
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
    >
      {item && (
        <div className="space-y-lg">
          <CollectionProductCell item={item} />

          <section className="rounded-lg border border-hairline bg-surface-elevated/30 p-md">
            <h3 className="text-body font-medium text-ink mb-sm">源商品</h3>
            <p className="text-caption text-muted mb-xs">商品 ID {item.sku}</p>
            {item.product_url ? (
              <a
                href={item.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-xs text-caption text-accent-violet-mid hover:underline cursor-pointer transition-colors duration-200"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                打开源商品
              </a>
            ) : (
              <p className="text-caption text-muted">暂无源商品链接</p>
            )}
            <p className="text-body font-medium mt-sm tabular-nums">
              Ozon 价 {formatCurrency(item.current_price)}
            </p>
          </section>

          <section>
            <h3 className="text-body font-medium text-ink mb-sm">1688 比价结果</h3>
            {!hasCompare ? (
              <div className="rounded-lg border border-dashed border-hairline p-lg text-center">
                <p className="text-body text-muted mb-xs">未比价</p>
                <p className="text-caption text-muted">
                  最近一次成功比价暂无候选。
                </p>
              </div>
            ) : (
              <ul className="space-y-sm">
                {MOCK_1688_CANDIDATES.map((c) => (
                  <li
                    key={c.title}
                    className="rounded-lg border border-hairline p-md hover:bg-surface-elevated/40 transition-colors duration-200"
                  >
                    <p className="text-body text-ink mb-xs">{c.title}</p>
                    <p className="text-caption text-muted">{c.shop}</p>
                    <p className="text-body font-medium tabular-nums mt-xs">
                      ¥{c.price.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
