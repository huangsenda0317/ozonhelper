"use client";

import React from "react";

import type { ProcessingOrder } from "@/lib/ozon-processing/types";
import { statusLabel } from "@/lib/ozon-processing/utils";

interface ProcessingProductCellProps {
  order: ProcessingOrder;
}

function SourceTag({ platform }: { platform: ProcessingOrder["source_platform"] }) {
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

function StatusTag({ status }: { status: ProcessingOrder["status"] }) {
  const colors: Record<ProcessingOrder["status"], string> = {
    pool: "bg-surface-elevated text-muted",
    processing: "bg-[#0369A1]/15 text-[#0369A1] dark:text-[#38BDF8]",
    finished: "bg-accent-lime/20 text-ink-deep dark:text-accent-lime",
    failed: "bg-accent-pink/15 text-accent-pink",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${colors[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ProcessingProductCell({ order }: ProcessingProductCellProps) {
  return (
    <div className="flex gap-sm min-w-[14rem] max-w-[22rem]">
      {order.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={order.photo_url}
          alt=""
          className="h-10 w-10 rounded object-cover shrink-0 bg-surface-elevated"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-surface-elevated shrink-0" />
      )}
      <div className="min-w-0 space-y-1">
        <p className="text-body font-medium line-clamp-2">{order.name}</p>
        <p className="text-caption text-muted">SKU: {order.sku}</p>
        <div className="flex flex-wrap gap-1">
          <SourceTag platform={order.source_platform} />
          <StatusTag status={order.status} />
        </div>
      </div>
    </div>
  );
}
