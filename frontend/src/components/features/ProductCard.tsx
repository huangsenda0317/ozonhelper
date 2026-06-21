"use client";

import React from "react";

import { Card } from "@/components/ui/Card";
import { formatRubPrice } from "@/lib/currency";

interface ProductCardProps {
  id: string;
  title: string;
  price_rub: number;
  rating: number | null;
  review_count: number;
  sales_trend: string | null;
  rank_position: number;
  image_url: string | null;
  is_selected: boolean;
  onSelect: (id: string) => void;
}

export function ProductCard({
  id,
  title,
  price_rub,
  rating,
  review_count,
  sales_trend,
  rank_position,
  image_url,
  is_selected,
  onSelect,
}: ProductCardProps) {
  const trendColor: Record<string, string> = {
    上升: "text-success",
    稳定: "text-muted",
    下降: "text-error",
  };

  return (
    <Card variant="default" padding="md" className="relative group">
      <div className="flex gap-lg">
        {/* 排名 */}
        <div className="flex-shrink-0 w-8 text-center">
          <span className="text-heading-sm font-display text-muted">
            {rank_position}
          </span>
        </div>

        {/* 图片 */}
        <div className="flex-shrink-0 w-20 h-20 bg-surface-elevated rounded-md overflow-hidden">
          {image_url ? (
            <img
              src={image_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-micro-cap">
              无图
            </div>
          )}
        </div>

        {/* 商品信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-medium truncate">{title}</h3>
          <div className="flex items-center gap-md mt-xs">
            <span className="text-heading-sm font-display">
              {formatRubPrice(price_rub)}
            </span>
            {rating && (
              <span className="text-caption text-muted">★ {rating}</span>
            )}
            <span className="text-caption text-muted">
              {review_count} 评价
            </span>
            {sales_trend && (
              <span
                className={`text-caption font-medium ${trendColor[sales_trend] || "text-muted"}`}
              >
                {sales_trend}
              </span>
            )}
          </div>
        </div>

        {/* 操作 */}
        <div className="flex-shrink-0 flex items-center">
          <button
            type="button"
            onClick={() => onSelect(id)}
            className={`px-lg py-sm rounded-md text-button-cap uppercase tracking-[0.2px] font-medium transition-colors duration-200 cursor-pointer ${
              is_selected
                ? "bg-accent-lime text-ink-deep"
                : "btn-primary"
            }`}
          >
            {is_selected ? "已选 ✓" : "加入选品池"}
          </button>
        </div>
      </div>
    </Card>
  );
}
