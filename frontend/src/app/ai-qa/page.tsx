"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

import { AIQAChat } from "@/components/features/ai-qa/AIQAChat";
import { useAuth } from "@/lib/auth-context";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  type ChatModelId,
} from "@/lib/sse-chat";
import { useStoreContext } from "@/lib/store-context";
import { useTheme } from "@/lib/theme-context";

function StoreSelect({
  stores,
  value,
  onChange,
  loading,
}: {
  stores: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string) => void;
  loading: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (loading) {
    return <span className="text-caption text-muted">加载店铺…</span>;
  }
  if (stores.length === 0) {
    return (
      <Link
        href="/settings/stores"
        className="text-caption text-accent-violet-mid hover:underline"
      >
        绑定店铺
      </Link>
    );
  }
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`text-caption rounded-md px-sm py-xs border ${
        isDark
          ? "bg-surface-elevated border-on-dark-faint text-on-primary"
          : "bg-surface-elevated border-hairline text-ink-deep"
      }`}
    >
      {stores.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

function ModelSelect({
  value,
  onChange,
}: {
  value: ChatModelId;
  onChange: (model: ChatModelId) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ChatModelId)}
      className={`text-caption rounded-md px-sm py-xs border ${
        isDark
          ? "bg-surface-elevated border-on-dark-faint text-on-primary"
          : "bg-surface-elevated border-hairline text-ink-deep"
      }`}
    >
      {CHAT_MODELS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );
}

function AIQAContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { stores, activeStoreId, setActiveStoreId, loading: storesLoading } =
    useStoreContext();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-xxl py-xxl">
      <header className="mb-xl">
        <p className="eyebrow-cap mb-sm">AI Assistant</p>
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h1
            className={`font-display font-bold text-heading-md flex items-center gap-sm ${
              isDark ? "text-on-primary" : "text-ink"
            }`}
          >
            <Bot className="h-7 w-7 text-accent-violet-mid" aria-hidden />
            AI{" "}
            <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
              问答
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-md">
            <label className="flex items-center gap-xs text-caption text-muted">
              店铺
              <StoreSelect
                stores={stores}
                value={activeStoreId}
                onChange={setActiveStoreId}
                loading={storesLoading}
              />
            </label>
            <label className="flex items-center gap-xs text-caption text-muted">
              模型
              <ModelSelect value={model} onChange={setModel} />
            </label>
          </div>
        </div>
        <p className="text-caption text-muted mt-sm">
          基于 DeepSeek，可查询当前店铺的 Ozon 订单、库存与卖家数据
        </p>
      </header>

      <AIQAChat
        storeId={activeStoreId}
        model={model}
        storesLoading={storesLoading}
        hasStores={stores.length > 0}
      />
    </div>
  );
}

export default function AIQAPage() {
  return <AIQAContent />;
}
