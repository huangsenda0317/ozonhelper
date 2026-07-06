"use client";

import React, { useMemo, useState } from "react";
import { Modal, message } from "antd";

import { ManagementBulkBar } from "@/components/features/ozon-management/ManagementBulkBar";
import { ManagementEmptyState } from "@/components/features/ozon-management/ManagementEmptyState";
import { ManagementFilterBar } from "@/components/features/ozon-management/ManagementFilterBar";
import { ManagementTable } from "@/components/features/ozon-management/ManagementTable";
import { useProcessing } from "@/lib/ozon-processing/processing-context";
import {
  DEFAULT_LISTING_FILTERS,
  filterListingItems,
  useManagement,
} from "@/lib/ozon-management/management-context";
import type { ListingFilters, ListingItem } from "@/lib/ozon-management/types";

export function ManagementShell() {
  const { items, removeItems, batchList } = useManagement();
  const { markListedToManagement } = useProcessing();

  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_LISTING_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ListingFilters>(
    DEFAULT_LISTING_FILTERS,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const pendingItems = useMemo(
    () => items.filter((i) => i.listing_status === "pending"),
    [items],
  );

  const filteredItems = useMemo(
    () => filterListingItems(pendingItems, appliedFilters),
    [pendingItems, appliedFilters],
  );

  const handleSearch = () => {
    setAppliedFilters(filters);
    setSelectedRowKeys([]);
  };

  const handleReset = () => {
    setFilters(DEFAULT_LISTING_FILTERS);
    setAppliedFilters(DEFAULT_LISTING_FILTERS);
    setSelectedRowKeys([]);
  };

  const rollbackProcessing = (removed: ListingItem[]) => {
    const orderIds = removed.map((i) => i.processing_order_id);
    if (orderIds.length) markListedToManagement(orderIds, false);
  };

  const handleRemoveOne = (item: ListingItem) => {
    const removed = removeItems([item.id]);
    rollbackProcessing(removed);
    message.success("已移出待上架");
  };

  const handleBatchRemove = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `确认移出 ${selectedRowKeys.length} 条待上架商品？`,
      okText: "移出",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        const removed = removeItems(selectedRowKeys.map(String));
        rollbackProcessing(removed);
        setSelectedRowKeys([]);
        message.success("已移出选中项");
      },
    });
  };

  const handleBatchList = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `确认批量上架 ${selectedRowKeys.length} 条商品？`,
      content: "首期 mock：将提交上架任务",
      okText: "确认上架",
      cancelText: "取消",
      onOk: () => {
        batchList(selectedRowKeys.map(String));
        setSelectedRowKeys([]);
        message.success("上架任务已提交（mock）");
      },
    });
  };

  const showEmpty = pendingItems.length === 0;

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="text-heading-md font-display text-ink mb-xs">商品管理</h1>
        <p className="text-caption text-muted">管理待上架商品，支持批量上架与移出</p>
      </header>

      <nav className="flex flex-wrap gap-xs border-b border-hairline pb-sm">
        <span className="px-md py-sm text-caption nav-tab-active">待上架商品</span>
      </nav>

      <ManagementFilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <ManagementBulkBar
        selectedCount={selectedRowKeys.length}
        onBatchList={handleBatchList}
        onBatchRemove={handleBatchRemove}
      />

      {showEmpty ? (
        <ManagementEmptyState />
      ) : (
        <ManagementTable
          items={filteredItems}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onRemove={handleRemoveOne}
        />
      )}
    </div>
  );
}
