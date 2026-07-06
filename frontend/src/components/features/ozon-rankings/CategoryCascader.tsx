"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Cascader } from "antd";
import type { DefaultOptionType } from "antd/es/cascader";

import { apiClient } from "@/lib/api-client";
import {
  fetchMockCategoryOptions,
  USE_OZON_RANKINGS_MOCK,
} from "@/lib/ozon-rankings/mock-service";
import {
  findCategoryPath,
  type CategoryOption,
  type CategoryOptionsData,
} from "@/lib/ozon-rankings/types";

interface CategoryCascaderProps {
  sortKey: string;
  value: string;
  onChange: (typeId: string) => void;
}

export function CategoryCascader({
  sortKey,
  value,
  onChange,
}: CategoryCascaderProps) {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (USE_OZON_RANKINGS_MOCK) {
          if (cancelled) return;
          const data = await fetchMockCategoryOptions();
          setOptions(data.options);
          return;
        }

        const params = new URLSearchParams({ sort_key: sortKey });
        const response = await apiClient.get<CategoryOptionsData>(
          `/ozon-rankings/category-options?${params}`,
        );
        if (cancelled) return;
        if (response.success && response.data) {
          setOptions(response.data.options);
        } else {
          setError(response.error?.message || "类目加载失败");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "类目加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sortKey]);

  const cascaderValue = useMemo(() => {
    if (!value || !options.length) return undefined;
    return findCategoryPath(options, value);
  }, [options, value]);

  return (
    <Cascader
      options={options as DefaultOptionType[]}
      value={cascaderValue}
      onChange={(values) => {
        const last = values?.[values.length - 1];
        onChange(last != null ? String(last) : "");
      }}
      placeholder={error || "选择类目"}
      status={error ? "error" : undefined}
      allowClear
      showSearch={{
        filter: (input, path) =>
          path.some((opt) =>
            String(opt.label ?? "")
              .toLowerCase()
              .includes(input.toLowerCase()),
          ),
      }}
      loading={loading}
      disabled={loading && !options.length}
      className="w-full min-w-[12rem] select-sentry filter-field-sentry"
      popupClassName="select-sentry-dropdown"
    />
  );
}
