"use client";

import React from "react";

import { Select } from "@/components/ui/Select";
import { StoreSelect } from "@/components/features/StoreSelect";
import {
  CHAT_MODELS,
  type ChatModelId,
} from "@/lib/sse-chat";
import { useStoreContext } from "@/lib/store-context";

interface AIQAHeaderControlsProps {
  model: ChatModelId;
  onModelChange: (model: ChatModelId) => void;
}

export function AIQAHeaderControls({
  model,
  onModelChange,
}: AIQAHeaderControlsProps) {
  const { stores, activeStoreId, setActiveStoreId, loading } = useStoreContext();

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-md shrink-0 w-full sm:w-auto">
      <div className="min-w-[10rem]">
        <span className="text-micro-cap uppercase tracking-[0.25px] text-muted block mb-xs">
          店铺
        </span>
        <StoreSelect
          stores={stores}
          value={activeStoreId}
          onChange={setActiveStoreId}
          loading={loading}
        />
      </div>
      <div className="min-w-[10rem]">
        <span className="text-micro-cap uppercase tracking-[0.25px] text-muted block mb-xs">
          模型
        </span>
        <Select
          value={model}
          onChange={(value) => onModelChange(value as ChatModelId)}
          options={CHAT_MODELS.map((m) => ({ label: m.label, value: m.value }))}
          aria-label="选择模型"
        />
      </div>
    </div>
  );
}
