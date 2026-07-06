"use client";

import React from "react";

import { ProcessingEditPage } from "@/components/features/ozon-processing/ProcessingEditPage";

export default function OzonAssistantProcessingEditRoute({
  params,
}: {
  params: { id: string };
}) {
  return <ProcessingEditPage orderId={params.id} />;
}
