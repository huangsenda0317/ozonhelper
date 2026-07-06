"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal, message } from "antd";

import { CollectionBulkBar } from "@/components/features/ozon-collection/CollectionBulkBar";
import { CollectionCompareDrawer } from "@/components/features/ozon-collection/CollectionCompareDrawer";
import { CollectionDetailDrawer } from "@/components/features/ozon-collection/CollectionDetailDrawer";
import { CollectionEditDrawer } from "@/components/features/ozon-collection/CollectionEditDrawer";
import { CollectionEmptyState } from "@/components/features/ozon-collection/CollectionEmptyState";
import { CollectionFilterBar } from "@/components/features/ozon-collection/CollectionFilterBar";
import { CollectionTable } from "@/components/features/ozon-collection/CollectionTable";
import {
  DEFAULT_COLLECTION_FILTERS,
  filterCollectionItems,
  useCollection,
} from "@/lib/ozon-collection/collection-context";
import type {
  CollectionFilters,
  CollectionItem,
  CollectionPanel,
} from "@/lib/ozon-collection/types";

function parsePanel(raw: string | null): CollectionPanel | null {
  if (raw === "detail" || raw === "edit" || raw === "compare") return raw;
  return null;
}

export function CollectionShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItems, updateItem, setProcessingStatus, getItemById } =
    useCollection();

  const [filters, setFilters] = useState<CollectionFilters>(
    DEFAULT_COLLECTION_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<CollectionFilters>(
    DEFAULT_COLLECTION_FILTERS,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const panelId = searchParams.get("id");
  const panel = parsePanel(searchParams.get("panel"));
  const activeItem = panelId ? getItemById(panelId) ?? null : null;

  const filteredItems = useMemo(
    () => filterCollectionItems(items, appliedFilters),
    [items, appliedFilters],
  );

  const openPanel = useCallback(
    (item: CollectionItem, nextPanel: CollectionPanel) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", item.id);
      params.set("panel", nextPanel);
      router.replace(`/ozon-assistant/collection?${params.toString()}`);
    },
    [router, searchParams],
  );

  const closePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    params.delete("panel");
    const qs = params.toString();
    router.replace(qs ? `/ozon-assistant/collection?${qs}` : "/ozon-assistant/collection");
  }, [router, searchParams]);

  const handleSearch = () => {
    setAppliedFilters(filters);
    setSelectedRowKeys([]);
  };

  const handleReset = () => {
    setFilters(DEFAULT_COLLECTION_FILTERS);
    setAppliedFilters(DEFAULT_COLLECTION_FILTERS);
    setSelectedRowKeys([]);
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `确认删除 ${selectedRowKeys.length} 条采集记录？`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        removeItems(selectedRowKeys.map(String));
        setSelectedRowKeys([]);
        message.success("已删除选中项");
      },
    });
  };

  const handleBatchProcess = () => {
    if (selectedRowKeys.length === 0) return;
    const ids = selectedRowKeys.map(String);
    setProcessingStatus(ids, "created");
    setSelectedRowKeys([]);
    message.success("已创建加工单，请前往「商品加工」查看");
  };

  const handleDeleteOne = (item: CollectionItem) => {
    removeItems([item.id]);
    if (panelId === item.id) closePanel();
    message.success("已删除");
  };

  const handleSaveEdit = (
    id: string,
    patch: Pick<CollectionItem, "collection_name" | "tags">,
  ) => {
    updateItem(id, patch);
    message.success("已保存");
  };

  const showEmpty = items.length === 0;

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="text-heading-md font-display text-ink mb-xs">商品采集</h1>
        <p className="text-caption text-muted">
          管理从选品排行榜采集的商品，支持筛选、批量加工与 1688 比价
        </p>
      </header>

      <CollectionFilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <CollectionBulkBar
        selectedCount={selectedRowKeys.length}
        onBatchProcess={handleBatchProcess}
        onBatchDelete={handleBatchDelete}
      />

      {showEmpty ? (
        <CollectionEmptyState />
      ) : (
        <CollectionTable
          items={filteredItems}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onDetail={(item) => openPanel(item, "detail")}
          onEdit={(item) => openPanel(item, "edit")}
          onCompare={(item) => openPanel(item, "compare")}
          onDelete={handleDeleteOne}
        />
      )}

      <CollectionDetailDrawer
        item={activeItem}
        open={panel === "detail" && Boolean(activeItem)}
        onClose={closePanel}
      />
      <CollectionEditDrawer
        item={activeItem}
        open={panel === "edit" && Boolean(activeItem)}
        onClose={closePanel}
        onSave={handleSaveEdit}
      />
      <CollectionCompareDrawer
        item={activeItem}
        open={panel === "compare" && Boolean(activeItem)}
        onClose={closePanel}
      />
    </div>
  );
}
