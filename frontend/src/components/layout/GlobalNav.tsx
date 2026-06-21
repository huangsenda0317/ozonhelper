"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { UserMenu } from "@/components/layout/UserMenu";

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

type NavItem = (typeof NAV_ITEMS)[number];

function isNavActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

function navLinkClass(isActive: boolean, isDark: boolean, variant: "bar" | "drawer") {
  if (variant === "bar") {
    return `px-3 py-1 text-caption rounded-md whitespace-nowrap cursor-pointer ${
      isActive
        ? isDark
          ? "bg-on-dark-faint text-on-primary font-medium"
          : "nav-tab-active"
        : "interactive-muted"
    }`;
  }
  return `block px-lg py-md text-body rounded-md cursor-pointer transition-colors duration-200 ${
    isActive
      ? isDark
        ? "bg-on-dark-faint text-on-primary font-medium"
        : "nav-tab-active"
      : "interactive-muted"
  }`;
}

export function GlobalNav() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const themeAriaLabel = isDark ? "切换到浅色模式" : "切换到深色模式";
  const ThemeIcon = isDark ? Sun : Moon;

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  const renderNavLinks = (variant: "bar" | "drawer") =>
    NAV_ITEMS.map((item) => {
      const isActive = isNavActive(pathname, item);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={variant === "drawer" ? closeMobileMenu : undefined}
          className={navLinkClass(isActive, isDark, variant)}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <>
      <nav className={isDark ? "nav-bar-dark" : "nav-bar-light"}>
        <div className="max-w-7xl mx-auto px-lg h-full">
          <div className="flex items-center justify-between h-full">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="打开导航菜单"
                  aria-expanded={mobileMenuOpen}
                  className={`inline-flex lg:hidden items-center justify-center h-8 w-8 shrink-0 rounded-md transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
                    isDark
                      ? "text-on-dark-muted hover:text-on-primary hover:bg-on-dark-faint"
                      : "interactive-muted"
                  }`}
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
                <Link
                  href="/"
                  className="hidden lg:block font-display text-heading-sm cursor-pointer transition-colors duration-200 hover:opacity-80"
                >
                  OzonHelper
                </Link>
              </>
            ) : (
              <Link
                href="/"
                className="font-display text-heading-sm cursor-pointer transition-colors duration-200 hover:opacity-80"
              >
                OzonHelper
              </Link>
            )}

            {isAuthenticated && (
              <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
                {renderNavLinks("bar")}
              </div>
            )}

            <div className="flex items-center gap-sm h-8">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={themeAriaLabel}
                className={`inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-md transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
                  isDark
                    ? "text-on-dark-muted hover:text-on-primary hover:bg-on-dark-faint"
                    : "interactive-muted"
                }`}
              >
                <ThemeIcon className="h-4 w-4" aria-hidden="true" />
              </button>

              {isAuthenticated ? (
                <UserMenu
                  displayName={user?.name || user?.email || "用户"}
                  isDark={isDark}
                  onLogout={logout}
                />
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`inline-flex items-center h-8 px-2 text-caption rounded-md transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
                      isDark
                        ? "text-on-dark-muted hover:text-on-primary hover:bg-on-dark-faint"
                        : "interactive-muted"
                    }`}
                  >
                    登录
                  </Link>
                  {/* <Button
                  variant="primary"
                  size="xs"
                  onClick={() => router.push("/register")}
                >
                  注册
                </Button> */}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {isAuthenticated && mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="absolute inset-0 bg-black/40 cursor-default"
            onClick={closeMobileMenu}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="导航菜单"
            className={`absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] flex flex-col border-r shadow-lg transition-transform duration-200 ${
              isDark
                ? "bg-surface-canvas-dark text-on-primary border-hairline-violet"
                : "bg-surface-canvas-light text-ink-deep border-hairline-cloud"
            }`}
          >
            <div className="flex items-center justify-between h-12 px-lg border-b border-inherit shrink-0">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="font-display text-heading-sm cursor-pointer transition-opacity duration-200 hover:opacity-80"
              >
                OzonHelper
              </Link>
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label="关闭菜单"
                className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
                  isDark
                    ? "text-on-dark-muted hover:text-on-primary hover:bg-on-dark-faint"
                    : "interactive-muted"
                }`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-md space-y-xs">
              {renderNavLinks("drawer")}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
