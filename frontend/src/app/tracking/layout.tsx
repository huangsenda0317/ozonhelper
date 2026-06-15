"use client";

import React from "react";

import { StoreProvider } from "@/lib/store-context";
import { TrackingShell } from "@/components/features/TrackingShell";

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <TrackingShell>{children}</TrackingShell>
    </StoreProvider>
  );
}
