"use client";

import React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";

export function ProcessingEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-surface-card p-xxl text-center">
      <div className="mx-auto mb-md flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
        <Inbox className="h-6 w-6 text-muted" aria-hidden="true" />
      </div>
      <h2 className="text-body font-medium text-ink mb-xs">加工池暂无商品</h2>
      <p className="text-caption text-muted mb-md max-w-md mx-auto">
        请先在商品采集中选择商品并批量加工，加工单将出现在加工池中
      </p>
      <Link
        href="/ozon-assistant/collection"
        className="inline-flex items-center gap-xs px-md py-sm text-caption rounded-full bg-accent-violet-mid text-white hover:opacity-90 cursor-pointer transition-opacity duration-200"
      >
        前往商品采集
      </Link>
    </div>
  );
}
