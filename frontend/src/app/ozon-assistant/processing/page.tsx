"use client";

import React, { Suspense } from "react";

import { ProcessingShell } from "@/components/features/ozon-processing/ProcessingShell";

function ProcessingLoading() {
  return (
    <div className="space-y-lg animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-surface-elevated" />
      <div className="h-24 rounded-xl bg-surface-elevated" />
      <div className="h-96 rounded-xl bg-surface-elevated" />
    </div>
  );
}

export default function OzonAssistantProcessingPage() {
  return (
    <Suspense fallback={<ProcessingLoading />}>
      <ProcessingShell />
    </Suspense>
  );
}
