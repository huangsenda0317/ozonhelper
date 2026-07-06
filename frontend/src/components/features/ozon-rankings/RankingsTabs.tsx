"use client";

import React from "react";

import { RANKING_VIEWS, type RankingView } from "@/lib/ozon-rankings/types";

interface RankingsTabsProps {
  view: RankingView;
  onChange: (view: RankingView) => void;
}

export function RankingsTabs({ view, onChange }: RankingsTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="榜单类型"
      className="flex flex-wrap gap-xs border-b border-hairline pb-sm"
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
            className={`px-md py-xs text-caption rounded-md whitespace-nowrap cursor-pointer transition-colors duration-200 ${
              active ? "nav-tab-active font-medium" : "interactive-muted-soft"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
