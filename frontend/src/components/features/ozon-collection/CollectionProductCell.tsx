"use client";

import React from "react";

import type { CollectionItem } from "@/lib/ozon-collection/types";

interface CollectionProductCellProps {
  item: CollectionItem;
}

function SourceTag({ platform }: { platform: CollectionItem["source_platform"] }) {
  const isOzon = platform === "OZON";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
        isOzon
          ? "bg-accent-violet-mid/10 text-accent-violet-mid"
          : "bg-[#F59E0B]/15 text-[#B45309] dark:text-[#F59E0B]"
      }`}
    >
      {platform}
    </span>
  );
}

function ProcessingTag({ status }: { status: CollectionItem["processing_status"] }) {
  const created = status === "created";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
        created
          ? "bg-accent-lime/20 text-ink-deep dark:text-accent-lime"
          : "bg-surface-elevated text-muted"
      }`}
    >
      {created ? "已创建加工" : "未创建加工"}
    </span>
  );
}

export function CollectionProductCell({ item }: CollectionProductCellProps) {
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
        {item.product_url ? (
          <a
            href={item.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body font-medium text-ink hover:text-accent-violet-mid line-clamp-2 cursor-pointer transition-colors duration-200"
          >
            {item.name}
          </a>
        ) : (
          <p className="text-body font-medium line-clamp-2">{item.name}</p>
        )}
        <div className="flex flex-wrap gap-1">
          <SourceTag platform={item.source_platform} />
          <ProcessingTag status={item.processing_status} />
        </div>
      </div>
    </div>
  );
}
