"use client";

import React, { useEffect, useState } from "react";
import { Drawer } from "antd";

import { Button } from "@/components/ui/Button";
import type { CollectionItem } from "@/lib/ozon-collection/types";

interface CollectionEditDrawerProps {
  item: CollectionItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Pick<CollectionItem, "collection_name" | "tags">) => void;
}

export function CollectionEditDrawer({
  item,
  open,
  onClose,
  onSave,
}: CollectionEditDrawerProps) {
  const [collectionName, setCollectionName] = useState("");
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    if (item) {
      setCollectionName(item.collection_name);
      setTagsText(item.tags.join(", "));
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;
    const tags = tagsText
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    onSave(item.id, { collection_name: collectionName.trim() || item.name, tags });
    onClose();
  };

  return (
    <Drawer
      title="编辑采集"
      open={open}
      onClose={onClose}
      width={440}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="ghost" size="xs" onClick={onClose} className="normal-case tracking-normal">
            取消
          </Button>
          <Button variant="primary" size="xs" onClick={handleSave} className="normal-case tracking-normal">
            保存
          </Button>
        </div>
      }
    >
      {item && (
        <div className="space-y-md">
          <div className="flex flex-col gap-xs">
            <label className="text-caption text-muted">商品</label>
            <p className="text-body text-ink">{item.name}</p>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-caption text-muted">来源</label>
            <p className="text-body text-ink">{item.source_platform}</p>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-caption text-muted">来源 ID</label>
            <p className="text-body text-ink tabular-nums">{item.sku}</p>
          </div>
          <div className="flex flex-col gap-xs">
            <label htmlFor="collection-name" className="text-caption text-muted">
              采集名称
            </label>
            <input
              id="collection-name"
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="input-sentry w-full"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label htmlFor="collection-tags" className="text-caption text-muted">
              采集标签（逗号分隔）
            </label>
            <input
              id="collection-tags"
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="热销, 跟卖"
              className="input-sentry w-full"
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
