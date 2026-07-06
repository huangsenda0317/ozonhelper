"use client";

import React, { useMemo } from "react";
import { Popconfirm, Table, type TableColumnsType } from "antd";
import { useRouter } from "next/navigation";

import { ManagementProductCell } from "@/components/features/ozon-management/ManagementProductCell";
import { formatCurrency, formatDateTime } from "@/lib/ozon-rankings/format";
import type { ListingItem } from "@/lib/ozon-management/types";

const PAGE_SIZE = 20;

interface ManagementTableProps {
  items: ListingItem[];
  loading?: boolean;
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onRemove: (item: ListingItem) => void;
}

const actionLinkClass =
  "text-caption cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 rounded-sm";

const SOURCE_STATUS_LABEL: Record<ListingItem["source_status"], string> = {
  collected: "已采集",
  processed: "已加工",
};

export function ManagementTable({
  items,
  loading,
  selectedRowKeys,
  onSelectionChange,
  onRemove,
}: ManagementTableProps) {
  const router = useRouter();

  const columns = useMemo((): TableColumnsType<ListingItem> => {
    return [
      {
        title: "商品信息",
        key: "product",
        width: 240,
        fixed: "left",
        render: (_, record) => <ManagementProductCell item={record} />,
      },
      {
        title: "当前价格",
        key: "current_price",
        width: 100,
        align: "right",
        render: (_, record) => formatCurrency(record.current_price),
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
        title: "来源状态",
        key: "source_status",
        width: 90,
        render: (_, record) => SOURCE_STATUS_LABEL[record.source_status],
      },
      {
        title: "加入待上架时间",
        key: "joined_at",
        width: 140,
        render: (_, record) => formatDateTime(record.joined_at),
      },
      {
        title: "操作",
        key: "action",
        width: 140,
        fixed: "right",
        render: (_, record) => (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <button
              type="button"
              onClick={() => router.push(`/ozon-assistant/management/${record.id}`)}
              className={`${actionLinkClass} text-accent-violet-mid hover:underline`}
            >
              详情
            </button>
            <Popconfirm
              title="确认移出待上架？"
              okText="移出"
              cancelText="取消"
              onConfirm={() => onRemove(record)}
            >
              <button
                type="button"
                className={`${actionLinkClass} text-accent-pink hover:underline`}
              >
                移出待上架
              </button>
            </Popconfirm>
          </div>
        ),
      },
    ];
  }, [onRemove, router]);

  return (
    <div className="ozon-data-table rounded-xl border border-hairline bg-surface-card overflow-x-auto">
      <Table<ListingItem>
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
        scroll={{ x: 900 }}
        size="small"
        rowClassName={() =>
          "transition-colors duration-200 hover:bg-surface-elevated/60 cursor-default"
        }
        locale={{ emptyText: "暂无数据" }}
      />
    </div>
  );
}
