"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  type TooltipComponentOption,
} from "echarts/components";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { CanvasRenderer } from "echarts/renderers";

import { TrendPoint } from "@/lib/hooks/useDashboard";
import { formatRubCompact, formatRubPrice } from "@/lib/currency";
import { useTheme } from "@/lib/theme-context";

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export type SalesChartType = "line" | "bar";
export type SalesMetric = "units" | "revenue";

const SERIES_COLOR = "#6a5fc1";
const REVENUE_COLOR = "#79628c";

const THEME_COLORS = {
  light: {
    axis: "#6b6578",
    splitLine: "#e5e7eb",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e5e7eb",
    tooltipText: "#1f1633",
  },
  dark: {
    axis: "#bdb8c0",
    splitLine: "#362d59",
    tooltipBg: "#1f1633",
    tooltipBorder: "#362d59",
    tooltipText: "#ffffff",
  },
} as const;

function formatDateLabel(date: string): string {
  if (date.length >= 10) return date.slice(5);
  return date;
}

function buildOption(
  data: TrendPoint[],
  chartType: SalesChartType,
  metric: SalesMetric,
  isDark: boolean,
): EChartsOption {
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const categories = data.map((d) => formatDateLabel(d.date));
  const isRevenue = metric === "revenue";
  const values = data.map((d) => (isRevenue ? d.revenue ?? 0 : d.units_sold));
  const seriesColor = isRevenue ? REVENUE_COLOR : SERIES_COLOR;
  const seriesName = isRevenue ? "营收" : "销量";

  const tooltip: TooltipComponentOption = {
    trigger: "axis",
    backgroundColor: colors.tooltipBg,
    borderColor: colors.tooltipBorder,
    textStyle: { color: colors.tooltipText, fontSize: 12 },
    axisPointer: {
      type: chartType === "line" ? "line" : "shadow",
    },
    formatter: (params) => {
      const items = Array.isArray(params) ? params : [params];
      const idx = items[0]?.dataIndex;
      if (idx == null || typeof idx !== "number") return "";
      const point = data[idx];
      if (!point) return "";
      const lines = [`<div style="font-weight:600;margin-bottom:4px">${point.date}</div>`];
      if (isRevenue) {
        lines.push(
          point.revenue != null
            ? `营收：${formatRubPrice(point.revenue)}`
            : "营收：暂无",
        );
        lines.push(`销量：${point.units_sold} 件`);
      } else {
        lines.push(`销量：${point.units_sold} 件`);
        if (point.revenue != null) {
          lines.push(`营收：${formatRubPrice(point.revenue)}`);
        }
      }
      return lines.join("<br/>");
    },
  };

  const seriesBase = {
    name: seriesName,
    type: chartType,
    data: values,
    itemStyle: { color: seriesColor },
  };

  const series =
    chartType === "line"
      ? {
          ...seriesBase,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2, color: seriesColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: isRevenue
                  ? "rgba(121, 98, 140, 0.25)"
                  : "rgba(106, 95, 193, 0.25)",
              },
              {
                offset: 1,
                color: isRevenue
                  ? "rgba(121, 98, 140, 0.02)"
                  : "rgba(106, 95, 193, 0.02)",
              },
            ]),
          },
        }
      : {
          ...seriesBase,
          barMaxWidth: 32,
          itemStyle: {
            color: seriesColor,
            borderRadius: [4, 4, 0, 0],
          },
        };

  return {
    animationDuration: 300,
    grid: { left: isRevenue ? 56 : 48, right: 16, top: 16, bottom: 28 },
    tooltip,
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: colors.splitLine } },
      axisTick: { show: false },
      axisLabel: { color: colors.axis, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: isRevenue ? undefined : 1,
      splitLine: { lineStyle: { color: colors.splitLine, type: "dashed" } },
      axisLabel: {
        color: colors.axis,
        fontSize: 11,
        formatter: isRevenue
          ? (v: number) => formatRubCompact(v)
          : undefined,
      },
    },
    series: [series],
  };
}

function PillSwitch<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { id: T; label: string }[];
}) {
  return (
    <div className="flex gap-xxs rounded-md p-xxs bg-surface-elevated/40">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`text-caption px-sm py-xxs rounded transition-colors cursor-pointer ${
            value === id
              ? "bg-surface-elevated font-medium text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function ChartTypeSwitch({
  value,
  onChange,
}: {
  value: SalesChartType;
  onChange: (type: SalesChartType) => void;
}) {
  return (
    <PillSwitch
      value={value}
      onChange={onChange}
      options={[
        { id: "line", label: "折线" },
        { id: "bar", label: "柱图" },
      ]}
    />
  );
}

export function MetricSwitch({
  value,
  onChange,
}: {
  value: SalesMetric;
  onChange: (metric: SalesMetric) => void;
}) {
  return (
    <PillSwitch
      value={value}
      onChange={onChange}
      options={[
        { id: "units", label: "销量" },
        { id: "revenue", label: "营收 (₽)" },
      ]}
    />
  );
}

export interface SalesTrendChartProps {
  data: TrendPoint[];
  chartType: SalesChartType;
  metric: SalesMetric;
  loading?: boolean;
}

export function SalesTrendChart({
  data,
  chartType,
  metric,
  loading = false,
}: SalesTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const isDark = resolvedTheme === "dark";
  const hasRevenue = useMemo(
    () => data.some((d) => d.revenue != null && d.revenue > 0),
    [data],
  );
  const option = useMemo(
    () =>
      data.length > 0 && (metric === "units" || hasRevenue)
        ? buildOption(data, chartType, metric, isDark)
        : null,
    [data, chartType, metric, isDark, hasRevenue],
  );

  const initOrUpdate = useCallback(() => {
    const el = containerRef.current;
    if (!el || !option) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(el, undefined, { renderer: "canvas" });
    }
    chartRef.current.setOption(option, { notMerge: true });
  }, [option]);

  useEffect(() => {
    if (!option) {
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
      return;
    }
    initOrUpdate();
  }, [option, initOrUpdate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  if (!loading && (data.length === 0 || (metric === "revenue" && !hasRevenue))) {
    return (
      <p className="text-caption text-muted py-lg text-center min-h-[240px] flex items-center justify-center">
        {metric === "revenue" && data.length > 0 ? "暂无营收数据" : "暂无趋势数据"}
      </p>
    );
  }

  return (
    <div className="relative min-h-[240px] w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-card/60 rounded-md">
          <p className="text-caption text-muted">加载趋势...</p>
        </div>
      )}
      <div ref={containerRef} className="h-[240px] w-full" aria-hidden={loading} />
    </div>
  );
}
