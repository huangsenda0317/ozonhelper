"use client";

import React from "react";
import Link from "next/link";

import { Select } from "@/components/ui/Select";

export interface StoreSelectProps {
  stores: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string) => void;
  loading?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function StoreSelect({
  stores,
  value,
  onChange,
  loading = false,
  className = "",
  "aria-label": ariaLabel = "选择店铺",
}: StoreSelectProps) {
  if (loading) {
    return <span className="text-caption text-muted">加载店铺…</span>;
  }

  if (stores.length === 0) {
    return (
      <Link
        href="/settings/stores"
        className="text-caption text-accent-violet-mid hover:underline cursor-pointer"
      >
        绑定店铺
      </Link>
    );
  }

  return (
    <Select
      className={className}
      value={value ?? undefined}
      onChange={(id) => onChange(String(id))}
      options={stores.map((s) => ({ label: s.name, value: s.id }))}
      aria-label={ariaLabel}
    />
  );
}
