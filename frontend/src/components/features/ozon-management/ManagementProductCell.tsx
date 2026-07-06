"use client";

import React from "react";

import type { ListingItem } from "@/lib/ozon-management/types";

interface ManagementProductCellProps {
  item: ListingItem;
}

export function ManagementProductCell({ item }: ManagementProductCellProps) {
  return (
    <div className="flex gap-sm min-w-[14rem] max-w-[22rem]">
      {item.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photo_url}
          alt=""
          className="h-10 w-10 rounded object-cover shrink-0 bg-surface-elevated"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-surface-elevated shrink-0" />
      )}
      <div className="min-w-0 space-y-1">
        <p className="text-body font-medium line-clamp-2">{item.title_zh}</p>
        <p className="text-caption text-muted">SKU: {item.sku}</p>
      </div>
    </div>
  );
}
