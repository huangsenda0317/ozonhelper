'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';

const NAV_ITEMS = [
  { href: '/rankings', label: '榜单发现' },
  { href: '/selection-pool', label: '选品池' },
  { href: '/products', label: '已采集商品' },
  { href: '/sourcing', label: '1688 比价' },
  { href: '/ai-edit', label: 'AI 改图', exact: true },
  { href: '/ai-edit/translate', label: 'AI 翻译' },
  { href: '/listing', label: '批量上架' },
  { href: '/tracking', label: '店铺跟踪' },
];

export function GlobalNav() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-black text-white">
      <div className="max-w-7xl mx-auto px-lg">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/" className="text-title font-display tracking-tight">
            OzonHelper
          </Link>

          {/* Navigation Links */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1 text-caption rounded-pill transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-ink-muted-48 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Side - Auth */}
          <div className="flex items-center gap-md">
            {isAuthenticated ? (
              <>
                <Link href="/settings" className="text-caption text-ink-muted-48 hover:text-white transition-colors">
                  {user?.name || user?.email}
                </Link>
                <Button variant="ghost" size="sm" onClick={logout} className="text-ink-muted-48 hover:text-white">
                  登出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-ink-muted-48 hover:text-white">
                    登录
                  </Button>
                </Link>
                <Link href="/register">
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
