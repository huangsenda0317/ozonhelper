"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/Button";

//! todo: 暂时隐藏榜单发现、选品池、已采集商品、1688 比价、批量上架
const NAV_ITEMS = [
  { href: "/tracking", label: "店铺跟踪" },
  // { href: "/rankings", label: "榜单发现" },
  // { href: "/selection-pool", label: "选品池" },
  // { href: "/products", label: "已采集商品" },
  // { href: "/sourcing", label: "1688 比价" },
  { href: "/ai-edit", label: "AI 改图", exact: true },
  { href: "/ai-qa", label: "AI 问答" },
  { href: "/ai-edit/translate", label: "AI 翻译" },
  // { href: "/listing", label: "批量上架" },
];

export function GlobalNav() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const themeAriaLabel = isDark ? "切换到浅色模式" : "切换到深色模式";
  const ThemeIcon = isDark ? Sun : Moon;

  return (
    <nav className={isDark ? "nav-bar-dark" : "nav-bar-light"}>
      <div className="max-w-7xl mx-auto px-lg h-full">
        <div className="flex items-center justify-between h-full">
          <Link
            href="/"
            className="font-display text-heading-sm cursor-pointer transition-colors duration-200 hover:opacity-80"
          >
            OzonHelper
          </Link>

          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1 text-caption rounded-md transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? isDark
                          ? "bg-on-dark-faint text-on-primary font-medium"
                          : "bg-surface-elevated text-ink-deep font-medium"
                        : isDark
                          ? "text-on-dark-muted hover:text-on-primary"
                          : "text-muted hover:text-ink-deep"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeAriaLabel}
              className={`p-2 rounded-md transition-colors duration-200 cursor-pointer ${
                isDark
                  ? "text-on-dark-muted hover:text-on-primary hover:bg-on-dark-faint"
                  : "text-muted hover:text-ink-deep hover:bg-surface-elevated"
              }`}
            >
              <ThemeIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  href="/settings"
                  className={`text-caption transition-colors duration-200 cursor-pointer ${
                    isDark
                      ? "text-on-dark-muted hover:text-on-primary"
                      : "text-muted hover:text-ink-deep"
                  }`}
                >
                  {user?.name || user?.email}
                </Link>
                <Button
                  variant={isDark ? "ghost-dark" : "ghost"}
                  size="sm"
                  onClick={logout}
                >
                  登出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="cursor-pointer">
                  <Button variant={isDark ? "ghost-dark" : "ghost"} size="sm">
                    登录
                  </Button>
                </Link>
                <Link href="/register" className="cursor-pointer">
                  <Button variant="primary" size="sm">
                    注册
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
