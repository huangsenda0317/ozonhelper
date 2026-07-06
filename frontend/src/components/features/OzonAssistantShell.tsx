"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Inbox,
  Package,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}[] = [
  {
    href: "/ozon-assistant/rankings",
    label: "选品排行榜",
    icon: BarChart3,
    exact: true,
  },
  {
    href: "/ozon-assistant/collection",
    label: "商品采集",
    icon: Inbox,
  },
  {
    href: "/ozon-assistant/processing",
    label: "商品加工",
    icon: Wrench,
  },
  {
    href: "/ozon-assistant/management",
    label: "商品管理",
    icon: Package,
  },
];

export function OzonAssistantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <nav className="flex flex-wrap gap-xs mb-xl border-b border-hairline pb-sm">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-xs px-md py-sm text-caption rounded-md transition-colors ${
                active ? "nav-tab-active" : "interactive-muted-soft"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
