"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { message } from "antd";

import { KpiSummaryBar } from "@/components/features/ozon-rankings/KpiSummaryBar";
import { RankingsFilterBar } from "@/components/features/ozon-rankings/RankingsFilterBar";
import {
  RankingsTable,
  RankingsTableError,
} from "@/components/features/ozon-rankings/RankingsTable";
import { RankingsTabs } from "@/components/features/ozon-rankings/RankingsTabs";
import { mapRankingItemToCollection } from "@/lib/ozon-collection/mappers";
import { useCollection } from "@/lib/ozon-collection/collection-context";
import {
  getRankingRowKey,
  isRankingRowCollectable,
} from "@/lib/ozon-collection/utils";
import {
  fetchMockRankings,
  USE_OZON_RANKINGS_MOCK,
} from "@/lib/ozon-rankings/mock-service";
import { apiClient } from "@/lib/api-client";
import type {
  RankingFilters,
  RankingItem,
  RankingListData,
  RankingListMeta,
  RankingView,
} from "@/lib/ozon-rankings/types";

const DEFAULT_FILTERS: RankingFilters = {
  sort_key: "sum_gmv_desc",
  keyword: "",
  category: "",
  sales_schema: "",
};

const PAGE_SIZE = 50;

function parseView(raw: string | null): RankingView {
  const views: RankingView[] = [
    "product",
    "category",
    "brand",
    "seller",
    "opportunity",
  ];
  return views.includes(raw as RankingView) ? (raw as RankingView) : "product";
}

function formatCollectFeedback(result: {
  added: { length: number };
  duplicateSkus: string[];
  skipped: number;
}) {
  const parts: string[] = [];
  if (result.added.length > 0) {
    parts.push(`成功采集 ${result.added.length} 件商品`);
  }
  if (result.duplicateSkus.length > 0) {
    parts.push(`${result.duplicateSkus.length} 件已在采集箱`);
  }
  if (result.skipped > 0) {
    parts.push(`跳过 ${result.skipped} 件不可采集项`);
  }
  return parts.join("，") || "未添加新商品";
}

export function RankingsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItems } = useCollection();

  const view = parseView(searchParams.get("view"));
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const [filters, setFilters] = useState<RankingFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<RankingFilters>(DEFAULT_FILTERS);

  const [data, setData] = useState<RankingListData | null>(null);
  const [meta, setMeta] = useState<RankingListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const itemKeyMap = useMemo(() => {
    const map = new Map<string, RankingItem>();
    items.forEach((item, index) => {
      map.set(getRankingRowKey(item, view, index), item);
    });
    return map;
  }, [items, view]);

  const updateUrl = useCallback(
    (next: { view?: RankingView; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.view) params.set("view", next.view);
      if (next.page != null) params.set("page", String(next.page));
      router.replace(`/ozon-assistant/rankings?${params.toString()}`);
    },
    [router, searchParams],
  );

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_OZON_RANKINGS_MOCK) {
        const { data: mockData, meta: mockMeta } = await fetchMockRankings({
          view,
          filters: appliedFilters,
          page,
          limit: PAGE_SIZE,
        });
        setData(mockData);
        setMeta(mockMeta);
        return;
      }

      const params = new URLSearchParams({
        view,
        sort_key: appliedFilters.sort_key,
        keyword: appliedFilters.keyword,
        category: appliedFilters.category,
        sales_schema: appliedFilters.sales_schema,
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      const response = await apiClient.get<RankingListData>(
        `/ozon-rankings?${params}`,
      );

      if (response.success && response.data) {
        setData(response.data);
        setMeta(response.meta as RankingListMeta | null);
      } else {
        setError(response.error?.message || "加载失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [view, appliedFilters, page]);

  useEffect(() => {
    setData(null);
    setMeta(null);
    setSelectedRowKeys([]);
  }, [view]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const collectRecords = useCallback(
    (records: RankingItem[], navigateAfter = false) => {
      const mappable = records.filter((r) => isRankingRowCollectable(r, view));
      const skipped = records.length - mappable.length;
      const toAdd = mappable
        .map((r) => mapRankingItemToCollection(r, view))
        .filter((item): item is NonNullable<typeof item> => item != null);

      const result = addItems(toAdd);
      const feedback = formatCollectFeedback({ ...result, skipped });
      if (result.added.length > 0) {
        message.success(feedback);
      } else {
        message.info(feedback);
      }

      if (navigateAfter && result.added.length > 0) {
        router.push("/ozon-assistant/collection");
      }
    },
    [addItems, router, view],
  );

  const handleCollectOne = useCallback(
    (record: RankingItem) => {
      collectRecords([record], false);
    },
    [collectRecords],
  );

  const handleBatchCollect = useCallback(() => {
    const records = selectedRowKeys
      .map((key) => itemKeyMap.get(String(key)))
      .filter((r): r is RankingItem => r != null);
    collectRecords(records, true);
    setSelectedRowKeys([]);
  }, [collectRecords, itemKeyMap, selectedRowKeys]);

  const handleViewChange = (nextView: RankingView) => {
    updateUrl({ view: nextView, page: 1 });
  };

  const handleSearch = () => {
    setAppliedFilters(filters);
    updateUrl({ page: 1 });
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    updateUrl({ page: 1 });
  };

  const handlePageChange = (nextPage: number) => {
    setSelectedRowKeys([]);
    updateUrl({ page: nextPage });
  };

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="text-heading-md font-display text-ink mb-xs">
          选品排行榜
        </h1>
        <p className="text-caption text-muted">
          Ozon 热销商品、类目、品牌、卖家与机会榜 — 数据驱动选品决策
        </p>
      </header>

      <RankingsFilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <RankingsTabs
        view={view}
        onChange={handleViewChange}
        selectedCount={selectedRowKeys.length}
        onBatchCollect={handleBatchCollect}
      />

      {error ? (
        <RankingsTableError message={error} onRetry={fetchRankings} />
      ) : (
        <RankingsTable
          view={view}
          items={items}
          loading={loading}
          page={page}
          total={meta?.total ?? 0}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onCollectOne={handleCollectOne}
        />
      )}
    </div>
  );
}
