"use client";

import React from "react";

import { OzonAssistantShell } from "@/components/features/OzonAssistantShell";

export default function OzonAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OzonAssistantShell>{children}</OzonAssistantShell>;
}
