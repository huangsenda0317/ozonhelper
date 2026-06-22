"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OrderDetailModal } from "@/components/features/OrderDetailModal";
import { useStoreContext } from "@/lib/store-context";
import { exportOrdersUrl, fetchOrders, fetchReturns, OrderSummary, shipOrder } from "@/lib/hooks/useOrders";
import { formatOrderStatus, formatReturnStatus } from "@/lib/order-status";

export default function OrdersPageContent() {
  const { activeStoreId, dataRefreshKey, activeStore } = useStoreContext();
  const searchParams = useSearchParams();
  const overdueOnly = searchParams.get("overdue") === "1";
  const postingParam = searchParams.get("posting");
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [returns, setReturns] = useState<Awaited<ReturnType<typeof fetchReturns>>["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [ftype, setFtype] = useState("ALL");
  const [tab, setTab] = useState<"orders" | "returns">("orders");
  const [shipTarget, setShipTarget] = useState<string | null>(null);
  const [detailPosting, setDetailPosting] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");
  const [shipping, setShipping] = useState(false);

  useEffect(() => {
    if (postingParam) {
      setTab("orders");
      setDetailPosting(postingParam);
    }
  }, [postingParam]);

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    if (tab === "returns") {
      fetchReturns(activeStoreId)
        .then((r) => setReturns(r.items))
        .finally(() => setLoading(false));
      return;
    }
    fetchOrders(activeStoreId, {
      fulfillment_type: ftype,
      is_overdue: overdueOnly ? true : undefined,
    })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [activeStoreId, ftype, overdueOnly, tab, dataRefreshKey]);

  const handleShip = async () => {
    if (!activeStoreId || !shipTarget || !tracking) return;
    setShipping(true);
    try {
      await shipOrder(activeStoreId, shipTarget, tracking);
      setShipTarget(null);
      setTracking("");
      const r = await fetchOrders(activeStoreId, { fulfillment_type: ftype });
      setItems(r.items);
    } finally {
      setShipping(false);
    }
  };

  if (loading) return <p className="text-caption text-muted">加载订单...</p>;

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex gap-sm">
          {(["orders", "returns"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`text-caption px-md py-xs rounded-md cursor-pointer transition-colors ${
                tab === t ? "bg-surface-elevated font-medium" : "text-muted"
              }`}
            >
              {t === "orders" ? "订单" : "售后"}
            </button>
          ))}
          {tab === "orders" &&
            ["ALL", "FBS", "FBO"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFtype(t)}
                className={`text-caption px-md py-xs rounded-md cursor-pointer ${
                  ftype === t ? "bg-surface-elevated font-medium" : "text-muted"
                }`}
              >
                {t === "ALL" ? "全部" : t}
              </button>
            ))}
        </div>
        {tab === "orders" && activeStoreId && (
          <a href={exportOrdersUrl(activeStoreId)} className="inline-flex">
            <Button variant="secondary" size="sm" className="gap-xs">
              <Download className="h-4 w-4" />
              导出 CSV
            </Button>
          </a>
        )}
      </div>

      {tab === "returns" && (
        <Card variant="default" padding="none" className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-hairline bg-surface-elevated">
                <th className="px-lg py-md text-micro-cap text-muted">退货 ID</th>
                <th className="px-lg py-md text-micro-cap text-muted">订单号</th>
                <th className="px-lg py-md text-micro-cap text-muted">状态</th>
                <th className="px-lg py-md text-micro-cap text-muted">原因</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.return_id} className="border-b border-hairline">
                  <td className="px-lg py-md font-mono text-caption">{r.return_id}</td>
                  <td className="px-lg py-md">{r.posting_number ?? "-"}</td>
                  <td className="px-lg py-md">{formatReturnStatus(r.status)}</td>
                  <td className="px-lg py-md text-caption text-muted">{r.reason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {returns.length === 0 && <p className="text-center text-muted py-xl">暂无售后记录</p>}
        </Card>
      )}

      {tab === "orders" && (
        <Card variant="default" padding="none" className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-hairline bg-surface-elevated">
                <th className="px-lg py-md text-micro-cap text-muted">订单号</th>
                <th className="px-lg py-md text-micro-cap text-muted">类型</th>
                <th className="px-lg py-md text-micro-cap text-muted">状态</th>
                <th className="px-lg py-md text-micro-cap text-muted">创建时间</th>
                <th className="px-lg py-md text-micro-cap text-muted">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr
                  key={o.posting_number}
                  className={`border-b border-hairline ${o.is_overdue ? "bg-accent-pink/5" : ""}`}
                >
                  <td className="px-lg py-md font-mono text-caption">
                    <button
                      type="button"
                      className="text-accent-violet-mid hover:underline cursor-pointer"
                      onClick={() => setDetailPosting(o.posting_number)}
                    >
                      {o.posting_number}
                    </button>
                  </td>
                  <td className="px-lg py-md">{o.fulfillment_type}</td>
                  <td className={`px-lg py-md ${o.is_overdue ? "text-accent-pink" : ""}`}>
                    {formatOrderStatus(o.status)}
                    {o.is_overdue && " ⚠"}
                  </td>
                  <td className="px-lg py-md text-caption text-muted">
                    {o.created_at ? new Date(o.created_at).toLocaleString("zh-CN") : "-"}
                  </td>
                  <td className="px-lg py-md">
                    {o.fulfillment_type === "FBS" && (
                      <button
                        type="button"
                        className="text-caption text-accent-violet-mid hover:underline cursor-pointer"
                        onClick={() => setShipTarget(o.posting_number)}
                      >
                        发货
                      </button>
                    )}
                    <a
                      href={`https://seller.ozon.ru/app/postings/fbs/${o.posting_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-caption text-muted hover:text-ink ml-md"
                    >
                      面单
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="text-center text-muted py-xl">
              暂无订单数据，请点击页面右上角「同步」拉取最近 30 天订单
            </p>
          )}
        </Card>
      )}

      {shipTarget && (
        <Card variant="default" padding="lg" className="max-w-md">
          <p className="text-body mb-md">发货：{shipTarget}</p>
          <input
            type="text"
            placeholder="运单号"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="w-full border border-hairline rounded-md px-md py-sm mb-md"
          />
          <div className="flex gap-sm">
            <Button variant="primary" size="sm" disabled={shipping} onClick={handleShip}>
              确认发货
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShipTarget(null)}>
              取消
            </Button>
          </div>
        </Card>
      )}

      <OrderDetailModal
        open={!!detailPosting}
        storeId={activeStoreId}
        postingNumber={detailPosting}
        settlementCurrency={activeStore?.settlement_currency ?? "RUB"}
        onClose={() => setDetailPosting(null)}
        onShip={setShipTarget}
      />
    </div>
  );
}
