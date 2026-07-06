"use client";

import React from "react";

import { ManagementDetailPage } from "@/components/features/ozon-management/ManagementDetailPage";

export default function OzonAssistantManagementDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return <ManagementDetailPage itemId={params.id} />;
}
