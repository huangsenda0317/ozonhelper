"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import {
  batchUpdatePrices,
  fetchPricing,
  fetchProfitConfig,
  PricingItem,
  ProfitConfig,
  saveProfitConfig,
} from "@/lib/hooks/usePricing";
import { formatRubPrice, RUB_SUFFIX } from "@/lib/currency";

const PROFIT_CONFIG_LABELS: Record<string, string> = {
  purchase_cost: `采购成本${RUB_SUFFIX}`,
  logistics_cost: `物流成本${RUB_SUFFIX}`,
  platform_fee_rate: "平台费率",
  exchange_rate: "汇率",
  margin_buffer: "利润缓冲",
  max_price_threshold: `最高限价${RUB_SUFFIX}`,
};

export default function PricingPage() {
  const searchParams = useSearchParams();
  const { activeStoreId, dataRefreshKey } = useStoreContext();
  const [items, setItems] = useState<PricingItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get("anomaly") === "1" ? "anomaly" : "all";
  const [tab, setTab] = useState<"all" | "anomaly" | "config">(initialTab);
  const [config, setConfig] = useState<ProfitConfig | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    fetchPricing(activeStoreId, { price_anomaly: tab === "anomaly" ? true : undefined })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [activeStoreId, tab, dataRefreshKey]);

  useEffect(() => {
    if (!activeStoreId || tab !== "config") return;
    fetchProfitConfig(activeStoreId).then(setConfig);
  }, [activeStoreId, tab]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchPrice = async () => {
    if (!activeStoreId || !newPrice) return;
    setSaving(true);
    try {
      const payload = items
        .filter((i) => selected.has(i.offer_id))
        .map((i) => ({ offer_id: i.offer_id, product_id: i.product_id, price: parseFloat(newPrice) }));
      await batchUpdatePrices(activeStoreId, payload);
      setSelected(new Set());
      const r = await fetchPricing(activeStoreId);
      setItems(r.items);
    } finally {
      setSaving(false);
    }
  };

  if (loading && tab !== "config") {
    return (
      <div className="space-y-md animate-pulse">
        <div className="h-10 bg-surface-elevated rounded-md" />
        <div className="h-64 bg-surface-elevated rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap gap-sm">
        {(["all", "anomaly", "config"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`text-caption px-md py-xs rounded-md cursor-pointer transition-colors ${
              tab === t ? "bg-surface-elevated font-medium" : "text-muted hover:text-ink"
            }`}
          >
            {t === "all" ? "全部" : t === "anomaly" ? "价格异常" : "成本模型"}
          </button>
        ))}
      </div>

      {tab === "config" && config && (
        <Card variant="default" padding="lg" className="max-w-lg space-y-md">
          {(["purchase_cost", "logistics_cost", "platform_fee_rate", "exchange_rate", "margin_buffer"] as const).map(
            (key) => (
              <label key={key} className="block">
                <span className="text-caption text-muted">{PROFIT_CONFIG_LABELS[key] ?? key}</span>
                <input
                  type="number"
                  step="0.01"
                  className="mt-xs w-full border border-hairline rounded-md px-md py-sm"
                  value={config[key]}
                  onChange={(e) => setConfig({ ...config, [key]: parseFloat(e.target.value) || 0 })}
                />
              </label>
            ),
          )}
          <Button
            variant="primary"
            onClick={async () => {
              if (activeStoreId && config) {
                await saveProfitConfig(activeStoreId, config);
              }
            }}
          >
            保存配置
          </Button>
        </Card>
      )}

      {tab !== "config" && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-hairline bg-surface-elevated">
                  <th className="px-lg py-md w-10" />
                  <th className="px-lg py-md text-micro-cap text-muted">商品</th>
                  <th className="px-lg py-md text-micro-cap text-muted">当前价{RUB_SUFFIX}</th>
                  <th className="px-lg py-md text-micro-cap text-muted">保本价{RUB_SUFFIX}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.offer_id}
                    className={`border-b border-hairline ${item.is_price_anomaly ? "bg-accent-pink/5" : ""}`}
                  >
                    <td className="px-lg py-md">
                      <input
                        type="checkbox"
                        checked={selected.has(item.offer_id)}
                        onChange={() => toggle(item.offer_id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-lg py-md">
                      <p className="text-body">{item.name ?? item.offer_id}</p>
                      <p className="text-caption text-muted">{item.offer_id}</p>
                    </td>
                    <td className="px-lg py-md">{formatRubPrice(item.price)}</td>
                    <td className={`px-lg py-md ${item.is_price_anomaly ? "text-accent-pink font-medium" : ""}`}>
                      {formatRubPrice(item.suggested_min_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-md bg-ink-deep text-on-primary px-lg py-md rounded-full shadow-lg">
              <span className="text-caption">已选 {selected.size} 项</span>
              <input
                type="number"
                placeholder={`新价格${RUB_SUFFIX}`}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-28 px-sm py-xs rounded text-ink"
              />
              <Button variant="primary" size="sm" disabled={saving} onClick={handleBatchPrice}>
                批量改价
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
