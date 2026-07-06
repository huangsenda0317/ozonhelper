"use client";

import React from "react";
import { Inbox } from "lucide-react";

import { RANKING_VIEWS, type RankingView } from "@/lib/ozon-rankings/types";

interface RankingsTabsProps {
  view: RankingView;
  onChange: (view: RankingView) => void;
  selectedCount?: number;
  onBatchCollect?: () => void;
}

export function RankingsTabs({
  view,
  onChange,
  selectedCount = 0,
  onBatchCollect,
}: RankingsTabsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-sm border-b border-hairline pb-sm">
      <div
        role="tablist"
        aria-label="榜单类型"
        className="flex flex-wrap gap-xs"
      >
        {RANKING_VIEWS.map((tab) => {
          const active = view === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={`px-md py-xs text-caption rounded-md whitespace-nowrap cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
                active ? "nav-tab-active font-medium" : "interactive-muted-soft"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {onBatchCollect && (
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onBatchCollect}
          className="bulk-action-btn bulk-action-btn--amber shrink-0"
        >
          <Inbox className="h-3 w-3 shrink-0" aria-hidden="true" />
          批量采集
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>
      )}
    </div>
  );
}
