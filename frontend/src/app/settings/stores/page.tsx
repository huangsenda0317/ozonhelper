"use client";

import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  createStore,
  deleteStore,
  fetchStores,
  StoreSummary,
  verifyStore,
} from "@/lib/hooks/useOrders";

export default function StoresSettingsPage() {
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = () => fetchStores().then(setStores);

  useEffect(() => {
    reload();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await createStore({ name, client_id: clientId, api_key: apiKey });
      setName("");
      setClientId("");
      setApiKey("");
      setMessage("店铺绑定成功");
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "绑定失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-xxl py-xxl space-y-xl">
      <div>
        <p className="eyebrow-cap mb-sm">Settings</p>
        <h1 className="font-display text-heading-md text-ink">Ozon 店铺管理</h1>
      </div>

      <Card variant="default" padding="lg">
        <h2 className="text-heading-sm mb-md">已绑定店铺</h2>
        <div className="space-y-sm">
          {stores.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-md border border-hairline rounded-lg"
            >
              <div>
                <p className="text-body font-medium">{s.name}</p>
                <p className="text-caption text-muted">
                  最后同步：{s.last_sync_at ? new Date(s.last_sync_at).toLocaleString("zh-CN") : "从未"}
                </p>
              </div>
              <div className="flex gap-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const r = await verifyStore(s.id);
                    setMessage(r?.valid ? "凭证有效" : r?.reason ?? "凭证无效");
                  }}
                >
                  校验
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await deleteStore(s.id);
                    await reload();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {stores.length === 0 && (
            <p className="text-caption text-muted">暂无店铺，请在下方添加</p>
          )}
        </div>
      </Card>

      <Card variant="default" padding="lg">
        <h2 className="text-heading-sm mb-md">新增店铺</h2>
        <form onSubmit={handleCreate} className="space-y-md">
          <input
            className="w-full input-sentry px-md py-sm rounded-md"
            placeholder="店铺名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="w-full input-sentry px-md py-sm rounded-md"
            placeholder="Client-Id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
          <input
            className="w-full input-sentry px-md py-sm rounded-md"
            placeholder="Api-Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
          {message && <p className="text-caption text-muted">{message}</p>}
          <Button variant="primary" type="submit" loading={loading}>
            绑定店铺
          </Button>
        </form>
      </Card>
    </div>
  );
}
