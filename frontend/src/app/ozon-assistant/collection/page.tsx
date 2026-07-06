"use client";

import React, { Suspense } from "react";

import { CollectionShell } from "@/components/features/ozon-collection/CollectionShell";

function CollectionLoading() {
  return (
    <div className="space-y-lg animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-surface-elevated" />
      <div className="h-24 rounded-xl bg-surface-elevated" />
      <div className="h-96 rounded-xl bg-surface-elevated" />
    </div>
  );
}

export default function OzonAssistantCollectionPage() {
  return (
    <Suspense fallback={<CollectionLoading />}>
      <CollectionShell />
    </Suspense>
  );
}
