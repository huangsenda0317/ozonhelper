"use client";

import React, { Suspense } from "react";

import { ManagementShell } from "@/components/features/ozon-management/ManagementShell";

function ManagementLoading() {
  return (
    <div className="space-y-lg animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-surface-elevated" />
      <div className="h-24 rounded-xl bg-surface-elevated" />
      <div className="h-96 rounded-xl bg-surface-elevated" />
    </div>
  );
}

export default function OzonAssistantManagementPage() {
  return (
    <Suspense fallback={<ManagementLoading />}>
      <ManagementShell />
    </Suspense>
  );
}
