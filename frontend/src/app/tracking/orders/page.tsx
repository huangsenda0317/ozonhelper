"use client";

import React, { Suspense } from "react";

import OrdersPageContent from "./OrdersPageContent";

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-caption text-muted">加载订单...</p>}>
      <OrdersPageContent />
    </Suspense>
  );
}
