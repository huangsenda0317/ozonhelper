"use client";

import React, { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import { fetchInventory, InventoryItem } from "@/lib/hooks/useInventory";

export default function InventoryPage() {
  const { activeStoreId, dataRefreshKey } = useStoreContext();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    fetchInventory(activeStoreId, { low_stock: false })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [activeStoreId, dataRefreshKey]);

  if (loading) return <p className="text-caption text-muted">加载库存...</p>;

  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      <table className="w-full text-left min-w-[640px]">
        <thead>
          <tr className="border-b border-hairline bg-surface-elevated">
            <th className="px-lg py-md text-micro-cap text-muted">商品</th>
            <th className="px-lg py-md text-micro-cap text-muted">仓库</th>
            <th className="px-lg py-md text-micro-cap text-muted">可用</th>
            <th className="px-lg py-md text-micro-cap text-muted">预留</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.product_id}-${item.warehouse_id}`}
              className={`border-b border-hairline ${item.is_low_stock ? "bg-accent-pink/5" : ""}`}
            >
              <td className="px-lg py-md">
                <p className="text-body">{item.name ?? item.offer_id}</p>
                <p className="text-caption text-muted">{item.offer_id}</p>
              </td>
              <td className="px-lg py-md text-caption">{item.warehouse_id}</td>
              <td className={`px-lg py-md ${item.is_low_stock ? "text-accent-pink font-medium" : ""}`}>
                {item.present}
              </td>
              <td className="px-lg py-md text-muted">{item.reserved}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <p className="text-center text-muted py-xl">暂无库存数据，请先同步</p>
      )}
    </Card>
  );
}
