"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  type TooltipComponentOption,
} from "echarts/components";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { CanvasRenderer } from "echarts/renderers";

import { TrendPoint } from "@/lib/hooks/useDashboard";
import { formatSellerCompact, formatSellerMoney, sellerCurrencySuffix } from "@/lib/currency";
import { useTheme } from "@/lib/theme-context";

echarts.use([LineChart, BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export type SalesChartType = "line" | "bar";

const UNITS_COLOR = "#6a5fc1";
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
  isDark: boolean,
  currency: string,
): EChartsOption {
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const categories = data.map((d) => formatDateLabel(d.date));
  const unitsData = data.map((d) => d.units_sold);
  const revenueData = data.map((d) => d.revenue ?? 0);
  const revenueLabel = `订单金额${sellerCurrencySuffix(currency)}`;

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
      lines.push(`销量：${point.units_sold} 件`);
      lines.push(
        point.revenue != null
          ? `${revenueLabel}：${formatSellerMoney(point.revenue, currency)}`
          : `${revenueLabel}：暂无`,
      );
      return lines.join("<br/>");
    },
  };

  const unitsSeries =
    chartType === "line"
      ? {
          name: "销量",
          type: "line" as const,
          yAxisIndex: 0,
          data: unitsData,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2, color: UNITS_COLOR },
          itemStyle: { color: UNITS_COLOR },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(106, 95, 193, 0.25)" },
              { offset: 1, color: "rgba(106, 95, 193, 0.02)" },
            ]),
          },
        }
      : {
          name: "销量",
          type: "bar" as const,
          yAxisIndex: 0,
          data: unitsData,
          barMaxWidth: 18,
          itemStyle: { color: UNITS_COLOR, borderRadius: [4, 4, 0, 0] },
        };

  const revenueSeries =
    chartType === "line"
      ? {
          name: revenueLabel,
          type: "line" as const,
          yAxisIndex: 1,
          data: revenueData,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2, color: REVENUE_COLOR },
          itemStyle: { color: REVENUE_COLOR },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(121, 98, 140, 0.2)" },
              { offset: 1, color: "rgba(121, 98, 140, 0.02)" },
            ]),
          },
        }
      : {
          name: revenueLabel,
          type: "bar" as const,
          yAxisIndex: 1,
          data: revenueData,
          barMaxWidth: 18,
          itemStyle: { color: REVENUE_COLOR, borderRadius: [4, 4, 0, 0] },
        };

  return {
    animationDuration: 300,
    legend: {
      data: ["销量", revenueLabel],
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: colors.axis, fontSize: 11 },
    },
    grid: { left: 48, right: 56, top: 36, bottom: 28 },
    tooltip,
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: colors.splitLine } },
      axisTick: { show: false },
      axisLabel: { color: colors.axis, fontSize: 11 },
    },
    yAxis: [
      {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: colors.splitLine, type: "dashed" } },
        axisLabel: { color: colors.axis, fontSize: 11 },
      },
      {
        type: "value",
        position: "right",
        splitLine: { show: false },
        axisLabel: {
          color: colors.axis,
          fontSize: 11,
          formatter: (v: number) => formatSellerCompact(v, currency),
        },
      },
    ],
    series: [unitsSeries, revenueSeries],
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

export interface SalesTrendChartProps {
  data: TrendPoint[];
  chartType: SalesChartType;
  currency?: string;
  loading?: boolean;
}

export function SalesTrendChart({
  data,
  chartType,
  currency = "RUB",
  loading = false,
}: SalesTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const isDark = resolvedTheme === "dark";
  const option = useMemo(
    () => (data.length > 0 ? buildOption(data, chartType, isDark, currency) : null),
    [data, chartType, isDark, currency],
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

  if (!loading && data.length === 0) {
    return (
      <p className="text-caption text-muted py-lg text-center min-h-[240px] flex items-center justify-center">
        暂无趋势数据
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
