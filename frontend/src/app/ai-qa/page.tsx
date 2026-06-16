"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

import { AIQAChat } from "@/components/features/ai-qa/AIQAChat";
import { AIQAHeaderControls } from "@/components/features/ai-qa/AIQAHeaderControls";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_CHAT_MODEL, type ChatModelId } from "@/lib/sse-chat";
import { useStoreContext } from "@/lib/store-context";

function AIQAContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { stores, activeStoreId, loading: storesLoading } = useStoreContext();
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
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="mb-xl">
        <p className="eyebrow-cap mb-sm">AI Q&A</p>
        <div className="flex flex-col gap-lg lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display font-bold text-heading-md text-ink flex items-center gap-sm flex-wrap">
              <Bot
                className="h-7 w-7 text-accent-violet-mid shrink-0"
                aria-hidden="true"
              />
              AI{" "}
              <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
                问答
              </span>
            </h1>
            <p className="text-caption text-muted mt-xs">
              基于 DeepSeek，可查询当前店铺的 Ozon 订单、库存与卖家数据
            </p>
          </div>
          <AIQAHeaderControls model={model} onModelChange={setModel} />
        </div>
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
