"use client";

import React, { useMemo } from "react";
import { Popconfirm, Table, type TableColumnsType } from "antd";

import { CollectionProductCell } from "@/components/features/ozon-collection/CollectionProductCell";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from "@/lib/ozon-rankings/format";
import type { CollectionItem } from "@/lib/ozon-collection/types";

const PAGE_SIZE = 20;

interface CollectionTableProps {
  items: CollectionItem[];
  loading?: boolean;
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onDetail: (item: CollectionItem) => void;
  onEdit: (item: CollectionItem) => void;
  onCompare: (item: CollectionItem) => void;
  onDelete: (item: CollectionItem) => void;
}

const actionLinkClass =
  "text-caption cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 rounded-sm";

export function CollectionTable({
  items,
  loading,
  selectedRowKeys,
  onSelectionChange,
  onDetail,
  onEdit,
  onCompare,
  onDelete,
}: CollectionTableProps) {
  const columns = useMemo((): TableColumnsType<CollectionItem> => {
    return [
      {
        title: "商品信息",
        key: "product",
        width: 240,
        fixed: "left",
        render: (_, record) => <CollectionProductCell item={record} />,
      },
      {
        title: "当前价格",
        key: "current_price",
        width: 100,
        align: "right",
        render: (_, record) => formatCurrency(record.current_price),
      },
      {
        title: "评分",
        key: "rating",
        width: 72,
        align: "right",
        render: (_, record) =>
          record.rating != null ? record.rating.toFixed(1) : "—",
      },
      {
        title: "评论数",
        key: "review_count",
        width: 80,
        align: "right",
        render: (_, record) => formatNumber(record.review_count),
      },
      {
        title: "跟卖数",
        key: "competitor_count",
        width: 80,
        align: "right",
        render: (_, record) => formatNumber(record.competitor_count),
      },
      {
        title: "销量",
        key: "sold_count",
        width: 80,
        align: "right",
        render: (_, record) => formatNumber(record.sold_count),
      },
      {
        title: "采集名称",
        key: "collection_name",
        width: 140,
        ellipsis: true,
        render: (_, record) => record.collection_name || "—",
      },
      {
        title: "品牌 / 卖家",
        key: "brand_seller",
        width: 120,
        ellipsis: true,
        render: (_, record) => {
          const parts = [record.brand, record.seller_name].filter(Boolean);
          return parts.length ? parts.join(" / ") : "—";
        },
      },
      {
        title: "采集时间",
        key: "collected_at",
        width: 120,
        render: (_, record) => formatDateTime(record.collected_at),
      },
      {
        title: "操作",
        key: "action",
        width: 160,
        fixed: "right",
        render: (_, record) => (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <button
              type="button"
              onClick={() => onDetail(record)}
              className={`${actionLinkClass} text-accent-violet-mid hover:underline`}
            >
              详情
            </button>
            <button
              type="button"
              onClick={() => onEdit(record)}
              className={`${actionLinkClass} text-accent-violet-mid hover:underline`}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => onCompare(record)}
              className={`${actionLinkClass} text-[#B45309] dark:text-[#F59E0B] hover:underline`}
            >
              比价
            </button>
            <Popconfirm
              title="确认删除该采集项？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => onDelete(record)}
            >
              <button
                type="button"
                className={`${actionLinkClass} text-accent-pink hover:underline`}
              >
                删除
              </button>
            </Popconfirm>
          </div>
        ),
      },
    ];
  }, [onCompare, onDelete, onDetail, onEdit]);

  return (
    <div className="ozon-data-table rounded-xl border border-hairline bg-surface-card overflow-x-auto">
      <Table<CollectionItem>
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => onSelectionChange(keys),
        }}
        pagination={{
          pageSize: PAGE_SIZE,
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 1200 }}
        size="small"
        rowClassName={() =>
          "transition-colors duration-200 hover:bg-surface-elevated/60 cursor-default"
        }
        locale={{ emptyText: "暂无数据" }}
      />
    </div>
  );
}
