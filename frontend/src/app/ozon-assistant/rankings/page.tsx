"use client";

import React, { Suspense } from "react";

import { RankingsShell } from "@/components/features/ozon-rankings/RankingsShell";

function RankingsLoading() {
  return (
    <div className="space-y-lg animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-surface-elevated" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-elevated" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-surface-elevated" />
      <div className="h-96 rounded-xl bg-surface-elevated" />
    </div>
  );
}

export default function OzonAssistantRankingsPage() {
  return (
    <Suspense fallback={<RankingsLoading />}>
      <RankingsShell />
    </Suspense>
  );
}
