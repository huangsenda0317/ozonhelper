"use client";

import React, { useMemo } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { Table, type TableColumnsType, type TableProps } from "antd";

import { Button } from "@/components/ui/Button";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/ozon-rankings/format";
import {
  isRankingRowCollectable,
  getRankingRowKey,
} from "@/lib/ozon-collection/utils";
import {
  isProductItem,
  isProductView,
  type AggregatedRankingItem,
  type ProductRankingItem,
  type RankingItem,
  type RankingView,
} from "@/lib/ozon-rankings/types";

interface RankingsTableProps {
  view: RankingView;
  items: RankingItem[];
  loading?: boolean;
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[]) => void;
  onCollectOne?: (record: RankingItem) => void;
}

function ProductCell({ item }: { item: ProductRankingItem }) {
  return (
    <div className="flex gap-sm min-w-[14rem] max-w-[20rem]">
      {item.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photo_url}
          alt=""
          className="h-10 w-10 rounded object-cover shrink-0 bg-surface-elevated"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-surface-elevated shrink-0" />
      )}
      <div className="min-w-0">
        {item.product_url ? (
          <a
            href={item.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body font-medium text-ink hover:text-accent-violet-mid line-clamp-2 cursor-pointer transition-colors duration-200"
          >
            {item.name || item.sku || "—"}
          </a>
        ) : (
          <p className="text-body font-medium line-clamp-2">{item.name || "—"}</p>
        )}
        {item.brand && (
          <p className="text-caption text-muted truncate">{item.brand}</p>
        )}
      </div>
    </div>
  );
}

function AggregatedCell({ item }: { item: AggregatedRankingItem }) {
  return (
    <div className="flex gap-sm min-w-[14rem] max-w-[20rem]">
      {item.top_photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.top_photo_url}
          alt=""
          className="h-10 w-10 rounded object-cover shrink-0 bg-surface-elevated"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-surface-elevated shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-body font-medium line-clamp-2">{item.label || "—"}</p>
        {item.secondary_label && (
          <p className="text-caption text-muted line-clamp-1">{item.secondary_label}</p>
        )}
        {(item.sample_brands?.length || item.sample_sellers?.length) && (
          <p className="text-caption text-muted truncate">
            {[...(item.sample_brands || []), ...(item.sample_sellers || [])]
              .slice(0, 3)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

function CollectAction({
  record,
  view,
  onCollectOne,
}: {
  record: RankingItem;
  view: RankingView;
  onCollectOne?: (record: RankingItem) => void;
}) {
  if (!onCollectOne || !isRankingRowCollectable(record, view)) return null;

  return (
    <button
      type="button"
      onClick={() => onCollectOne(record)}
      className="inline-flex items-center gap-0.5 text-caption text-accent-violet-mid hover:underline cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 rounded-sm"
    >
      <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />
      添加采集
    </button>
  );
}

export function RankingsTable({
  view,
  items,
  loading,
  page,
  total,
  pageSize,
  onPageChange,
  selectedRowKeys = [],
  onSelectionChange,
  onCollectOne,
}: RankingsTableProps) {
  const rowSelection = useMemo((): TableProps<RankingItem>["rowSelection"] => {
    if (!onSelectionChange) return undefined;
    return {
      selectedRowKeys,
      onChange: (keys: React.Key[]) => onSelectionChange(keys),
      getCheckboxProps: (record: RankingItem) => ({
        disabled: !isRankingRowCollectable(record, view),
      }),
    };
  }, [selectedRowKeys, onSelectionChange, view]);

  const columns = useMemo((): TableColumnsType<RankingItem> => {
    const actionWidth = onCollectOne ? 120 : 72;

    const renderAction = (record: RankingItem, externalUrl?: string | null) => (
      <div className="flex flex-col gap-0.5 items-start">
        <CollectAction record={record} view={view} onCollectOne={onCollectOne} />
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-xs text-caption text-muted hover:text-accent-violet-mid hover:underline cursor-pointer transition-colors duration-200"
          >
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            Ozon
          </a>
        ) : null}
      </div>
    );

    if (isProductView(view)) {
      const cols: TableColumnsType<RankingItem> = [
        {
          title: "排名",
          dataIndex: "rank_no",
          key: "rank_no",
          width: 64,
          fixed: "left",
          render: (v: number | null) => (
            <span className="tabular-nums font-medium">{v ?? "—"}</span>
          ),
        },
        {
          title: "商品",
          key: "product",
          width: 220,
          render: (_, record) =>
            isProductItem(record, view) ? <ProductCell item={record} /> : null,
        },
        {
          title: "类目路径",
          key: "category_path_zh",
          width: 160,
          ellipsis: true,
          render: (_, record) =>
            isProductItem(record, view) ? record.category_path_zh || "—" : null,
        },
        {
          title: "卖家",
          key: "seller_name",
          width: 100,
          ellipsis: true,
          render: (_, record) =>
            isProductItem(record, view) ? record.seller_name || "—" : null,
        },
        {
          title: "GMV",
          key: "gmv_sum",
          width: 120,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatCurrency(record.gmv_sum)
              : null,
        },
        {
          title: "销量",
          key: "sold_count",
          width: 90,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatNumber(record.sold_count)
              : null,
        },
        {
          title: "销售额",
          key: "sold_sum",
          width: 110,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatCurrency(record.sold_sum)
              : null,
        },
        {
          title: "均价",
          key: "avg_price",
          width: 90,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatCurrency(record.avg_price)
              : null,
        },
        {
          title: "搜索会话",
          key: "session_count_search",
          width: 100,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatNumber(record.session_count_search)
              : null,
        },
        {
          title: "曝光",
          key: "views",
          width: 90,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view) ? formatNumber(record.views) : null,
        },
        {
          title: "搜索加购",
          key: "conv_to_cart_search",
          width: 90,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatPercent(record.conv_to_cart_search)
              : null,
        },
        {
          title: "PDP加购",
          key: "pdp_to_cart_conversion",
          width: 90,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatPercent(record.pdp_to_cart_conversion)
              : null,
        },
        {
          title: "库存",
          key: "stock",
          width: 72,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view) ? formatNumber(record.stock) : null,
        },
        {
          title: "更新时间",
          key: "updated_at",
          width: 110,
          render: (_, record) =>
            isProductItem(record, view)
              ? formatDateTime(record.updated_at)
              : null,
        },
      ];

      if (view === "opportunity") {
        cols.splice(4, 0, {
          title: "机会分",
          key: "opportunity_score",
          width: 80,
          align: "right",
          render: (_, record) =>
            isProductItem(record, view)
              ? formatNumber(record.opportunity_score)
              : null,
        });
        cols.splice(5, 0, {
          title: "机会原因",
          key: "opportunity_reasons",
          width: 140,
          ellipsis: true,
          render: (_, record) =>
            isProductItem(record, view)
              ? record.opportunity_reasons?.join("；") || "—"
              : null,
        });
      }

      cols.push({
        title: "操作",
        key: "action",
        width: actionWidth,
        fixed: "right",
        render: (_, record) =>
          isProductItem(record, view)
            ? renderAction(record, record.product_url)
            : null,
      });

      return cols;
    }

    const labelTitle =
      view === "category" ? "类目" : view === "brand" ? "品牌" : "卖家";

    return [
      {
        title: "排名",
        dataIndex: "rank_no",
        key: "rank_no",
        width: 64,
        fixed: "left",
        render: (v: number | null) => (
          <span className="tabular-nums font-medium">{v ?? "—"}</span>
        ),
      },
      {
        title: labelTitle,
        key: "label",
        width: 220,
        render: (_, record) =>
          !isProductItem(record, view) ? (
            <AggregatedCell item={record as AggregatedRankingItem} />
          ) : null,
      },
      {
        title: "GMV",
        key: "total_gmv",
        width: 120,
        align: "right",
        render: (_, record) =>
          !isProductItem(record, view)
            ? formatCurrency((record as AggregatedRankingItem).total_gmv)
            : null,
      },
      {
        title: "销量",
        key: "total_sold_count",
        width: 90,
        align: "right",
        render: (_, record) =>
          !isProductItem(record, view)
            ? formatNumber((record as AggregatedRankingItem).total_sold_count)
            : null,
      },
      {
        title: "搜索会话",
        key: "total_search_sessions",
        width: 100,
        align: "right",
        render: (_, record) =>
          !isProductItem(record, view)
            ? formatNumber((record as AggregatedRankingItem).total_search_sessions)
            : null,
      },
      {
        title: "曝光",
        key: "total_views",
        width: 90,
        align: "right",
        render: (_, record) =>
          !isProductItem(record, view)
            ? formatNumber((record as AggregatedRankingItem).total_views)
            : null,
      },
      {
        title: "均价",
        key: "avg_price",
        width: 90,
        align: "right",
        render: (_, record) =>
          !isProductItem(record, view)
            ? formatCurrency((record as AggregatedRankingItem).avg_price)
            : null,
      },
      {
        title: "平均搜索加购",
        key: "avg_search_cart_conversion",
        width: 110,
        align: "right",
        render: (_, record) =>
          !isProductItem(record, view)
            ? formatPercent((record as AggregatedRankingItem).avg_search_cart_conversion)
            : null,
      },
      {
        title: "代表商品",
        key: "top_product_name",
        width: 180,
        ellipsis: true,
        render: (_, record) => {
          if (isProductItem(record, view)) return null;
          const agg = record as AggregatedRankingItem;
          if (!agg.top_product_url) return agg.top_product_name || "—";
          return (
            <a
              href={agg.top_product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-violet-mid hover:underline cursor-pointer transition-colors duration-200"
            >
              {agg.top_product_name || "—"}
            </a>
          );
        },
      },
      {
        title: "操作",
        key: "action",
        width: actionWidth,
        fixed: "right",
        render: (_, record) => {
          if (isProductItem(record, view)) return null;
          const agg = record as AggregatedRankingItem;
          return renderAction(record, agg.top_product_url);
        },
      },
    ];
  }, [view, onCollectOne]);

  return (
    <div className="ozon-data-table rounded-xl border border-hairline bg-surface-card overflow-x-auto">
      <Table<RankingItem>
        key={`${view}-${page}`}
        rowKey={(record, index) => getRankingRowKey(record, view, index ?? 0)}
        columns={columns}
        dataSource={items}
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: isProductView(view) ? 1680 : 1280 }}
        size="small"
        rowClassName={() =>
          "transition-colors duration-200 hover:bg-surface-elevated/60 cursor-default"
        }
        locale={{ emptyText: "暂无数据" }}
      />
    </div>
  );
}

interface RankingsTableErrorProps {
  message: string;
  onRetry: () => void;
}

export function RankingsTableError({ message, onRetry }: RankingsTableErrorProps) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-xxl text-center">
      <p className="text-body text-muted mb-md">{message}</p>
      <Button variant="primary" size="sm" onClick={onRetry} className="normal-case tracking-normal">
        重试
      </Button>
    </div>
  );
}
