"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Modal, message } from "antd";

import { ProcessingBulkBar } from "@/components/features/ozon-processing/ProcessingBulkBar";
import { ProcessingEmptyState } from "@/components/features/ozon-processing/ProcessingEmptyState";
import { ProcessingFilterBar } from "@/components/features/ozon-processing/ProcessingFilterBar";
import { ProcessingTable } from "@/components/features/ozon-processing/ProcessingTable";
import { useCollection } from "@/lib/ozon-collection/collection-context";
import { useManagement } from "@/lib/ozon-management/management-context";
import {
  DEFAULT_PROCESSING_FILTERS,
  filterProcessingOrders,
  useProcessing,
} from "@/lib/ozon-processing/processing-context";
import {
  PROCESSING_STATUS_TABS,
  type ProcessingFilters,
  type ProcessingOrder,
  type ProcessingStatus,
} from "@/lib/ozon-processing/types";
import { canJoinListing } from "@/lib/ozon-processing/utils";

export function ProcessingShell() {
  const { orders, removeOrders, setOrderStatus, markListedToManagement } = useProcessing();
  const { createFromProcessing } = useManagement();
  const { setProcessingStatus } = useCollection();

  const [activeStatus, setActiveStatus] = useState<ProcessingStatus>("pool");
  const [filters, setFilters] = useState<ProcessingFilters>(DEFAULT_PROCESSING_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ProcessingFilters>(
    DEFAULT_PROCESSING_FILTERS,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const filteredOrders = useMemo(
    () => filterProcessingOrders(orders, activeStatus, appliedFilters),
    [orders, activeStatus, appliedFilters],
  );

  const handleSearch = () => {
    setAppliedFilters(filters);
    setSelectedRowKeys([]);
  };

  const handleReset = () => {
    setFilters(DEFAULT_PROCESSING_FILTERS);
    setAppliedFilters(DEFAULT_PROCESSING_FILTERS);
    setSelectedRowKeys([]);
  };

  const rollbackCollection = useCallback(
    (removed: ProcessingOrder[]) => {
      const ids = removed.map((o) => o.collection_item_id);
      if (ids.length) setProcessingStatus(ids, "pending");
    },
    [setProcessingStatus],
  );

  const handleDeleteOne = (order: ProcessingOrder) => {
    const removed = removeOrders([order.id]);
    rollbackCollection(removed);
    message.success("已删除");
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `确认删除 ${selectedRowKeys.length} 条加工单？`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        const removed = removeOrders(selectedRowKeys.map(String));
        rollbackCollection(removed);
        setSelectedRowKeys([]);
        message.success("已删除选中项");
      },
    });
  };

  const joinOrdersToListing = (targetOrders: ProcessingOrder[]) => {
    const eligible = targetOrders.filter((o) => canJoinListing(o));
    if (eligible.length === 0) {
      message.warning("请先完善商品标题后再加入待上架");
      return;
    }
    eligible.forEach((o) => {
      if (o.status !== "finished") setOrderStatus([o.id], "finished");
    });
    const finished = eligible.map((o) =>
      o.status === "finished" ? o : { ...o, status: "finished" as const },
    );
    const { created, duplicateOrderIds } = createFromProcessing(finished);
    markListedToManagement(
      created.map((l) => l.processing_order_id),
      true,
    );
    if (duplicateOrderIds.length) {
      message.info(`${duplicateOrderIds.length} 条已在待上架列表中，已跳过`);
    }
    if (created.length) {
      message.success(`已加入 ${created.length} 条待上架，请前往「商品管理」查看`);
    }
  };

  const handleJoinListing = (order: ProcessingOrder) => {
    joinOrdersToListing([order]);
  };

  const handleBatchJoinListing = () => {
    const selected = orders.filter((o) => selectedRowKeys.includes(o.id));
    joinOrdersToListing(selected);
    setSelectedRowKeys([]);
  };

  const handleRecreate = (order: ProcessingOrder) => {
    Modal.confirm({
      title: "重新创建加工单？",
      content: "将重置为加工池状态，已填写的文案会保留。",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        setOrderStatus([order.id], "pool");
        markListedToManagement([order.id], false);
        message.success("已重新创建加工单");
      },
    });
  };

  const showEmpty = orders.length === 0 && activeStatus === "pool";

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="text-heading-md font-display text-ink mb-xs">商品加工</h1>
        <p className="text-caption text-muted">
          编辑商品标题、标签与描述，支持 AI 一键优化（中文编辑，上架前转俄文）
        </p>
      </header>

      <nav className="flex flex-wrap gap-xs border-b border-hairline pb-sm">
        {PROCESSING_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveStatus(tab.value);
              setSelectedRowKeys([]);
            }}
            className={`px-md py-sm text-caption rounded-md cursor-pointer transition-colors duration-200 ${
              activeStatus === tab.value ? "nav-tab-active" : "interactive-muted-soft"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <ProcessingFilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <ProcessingBulkBar
        selectedCount={selectedRowKeys.length}
        activeStatus={activeStatus}
        onBatchDelete={handleBatchDelete}
        onBatchJoinListing={activeStatus === "finished" ? handleBatchJoinListing : undefined}
      />

      {showEmpty ? (
        <ProcessingEmptyState />
      ) : (
        <ProcessingTable
          orders={filteredOrders}
          activeStatus={activeStatus}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onDelete={handleDeleteOne}
          onJoinListing={handleJoinListing}
          onRecreate={handleRecreate}
        />
      )}
    </div>
  );
}
