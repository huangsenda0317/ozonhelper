"use client";

import React from "react";

import { OzonAssistantShell } from "@/components/features/OzonAssistantShell";
import { CollectionProvider } from "@/lib/ozon-collection/collection-context";
import { ManagementProvider } from "@/lib/ozon-management/management-context";
import { ProcessingProvider } from "@/lib/ozon-processing/processing-context";

export default function OzonAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CollectionProvider>
      <ProcessingProvider>
        <ManagementProvider>
          <OzonAssistantShell>{children}</OzonAssistantShell>
        </ManagementProvider>
      </ProcessingProvider>
    </CollectionProvider>
  );
}
