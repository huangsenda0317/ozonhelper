import React from "react";

import { StoreProvider } from "@/lib/store-context";

export default function AIQALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreProvider>{children}</StoreProvider>;
}
