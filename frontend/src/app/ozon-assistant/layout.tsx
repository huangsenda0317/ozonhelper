"use client";

import React from "react";

import { OzonAssistantShell } from "@/components/features/OzonAssistantShell";
import { CollectionProvider } from "@/lib/ozon-collection/collection-context";

export default function OzonAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CollectionProvider>
      <OzonAssistantShell>{children}</OzonAssistantShell>
    </CollectionProvider>
  );
}
