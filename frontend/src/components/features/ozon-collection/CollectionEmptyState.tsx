"use client";

import React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";

export function CollectionEmptyState() {
  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-xxl text-center">
      <Inbox
        className="h-10 w-10 text-accent-violet-mid mx-auto mb-md opacity-70"
        aria-hidden="true"
      />
      <p className="text-body text-muted mb-md">采集箱暂无商品</p>
      <p className="text-caption text-muted mb-lg">
        从选品排行榜添加采集，或批量采集潜力商品
      </p>
      <Link
        href="/ozon-assistant/rankings"
        className="inline-flex items-center justify-center min-h-8 h-8 px-md text-caption font-medium rounded-md bg-accent-violet-mid text-on-primary hover:opacity-90 transition-opacity duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40"
      >
        前往选品排行榜
      </Link>
    </div>
  );
}
