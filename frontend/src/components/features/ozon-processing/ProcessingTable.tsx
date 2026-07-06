"use client";

import React, { useMemo } from "react";
import { Popconfirm, Progress, Table, type TableColumnsType } from "antd";
import { useRouter } from "next/navigation";

import { ProcessingProductCell } from "@/components/features/ozon-processing/ProcessingProductCell";
import { statusLabel } from "@/lib/ozon-processing/utils";
import type { ProcessingOrder, ProcessingStatus } from "@/lib/ozon-processing/types";

const PAGE_SIZE = 20;

interface ProcessingTableProps {
  orders: ProcessingOrder[];
  activeStatus: ProcessingStatus;
  loading?: boolean;
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onDelete: (order: ProcessingOrder) => void;
  onJoinListing: (order: ProcessingOrder) => void;
  onRecreate: (order: ProcessingOrder) => void;
}

const actionLinkClass =
  "text-caption cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 rounded-sm";

export function ProcessingTable({
  orders,
  activeStatus,
  loading,
  selectedRowKeys,
  onSelectionChange,
  onDelete,
  onJoinListing,
  onRecreate,
}: ProcessingTableProps) {
  const router = useRouter();

  const columns = useMemo((): TableColumnsType<ProcessingOrder> => {
    return [
      {
        title: "商品信息",
        key: "product",
        width: 240,
        fixed: "left",
        render: (_, record) => <ProcessingProductCell order={record} />,
      },
      {
        title: "商品标题",
        key: "title_zh",
        width: 200,
        ellipsis: true,
        render: (_, record) => record.title_zh || "—",
      },
      {
        title: "属性完整度",
        key: "completeness",
        width: 120,
        render: (_, record) => (
          <Progress
            percent={record.attribute_completeness}
            size="small"
            strokeColor={record.attribute_completeness >= 100 ? "#22c55e" : "#0369A1"}
          />
        ),
      },
      {
        title: "加工状态",
        key: "status",
        width: 100,
        render: (_, record) => statusLabel(record.status),
      },
      {
        title: "操作",
        key: "action",
        width: 200,
        fixed: "right",
        render: (_, record) => (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <button
              type="button"
              onClick={() => router.push(`/ozon-assistant/processing/${record.id}`)}
              className={`${actionLinkClass} text-accent-violet-mid hover:underline`}
            >
              编辑加工
            </button>
            {activeStatus === "finished" && (
              <>
                <button
                  type="button"
                  onClick={() => onJoinListing(record)}
                  disabled={!record.title_zh.trim()}
                  className={`${actionLinkClass} text-[#0369A1] dark:text-[#38BDF8] hover:underline disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  加入待上架
                </button>
                <button
                  type="button"
                  onClick={() => onRecreate(record)}
                  className={`${actionLinkClass} text-muted hover:underline`}
                >
                  重新创建
                </button>
              </>
            )}
            <Popconfirm
              title="确认删除该加工单？"
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
  }, [activeStatus, onDelete, onJoinListing, onRecreate, router]);

  return (
    <div className="ozon-data-table rounded-xl border border-hairline bg-surface-card overflow-x-auto">
      <Table<ProcessingOrder>
        rowKey="id"
        columns={columns}
        dataSource={orders}
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
