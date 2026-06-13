'use client';

import React from 'react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TOOLBOX_ITEMS = [
  { href: '/rankings', label: '榜单发现', desc: '浏览 Ozon 排行榜，锁定潜力商品', icon: '📊' },
  { href: '/selection-pool', label: '选品池', desc: '管理候选商品，批量操作', icon: '📋' },
  { href: '/products', label: '已采集商品', desc: '查看完整字段，去重管理', icon: '📦' },
  { href: '/sourcing', label: '1688 比价', desc: '搜索货源，计算毛利率', icon: '💰' },
  { href: '/ai-edit', label: 'AI 改图', desc: 'SeedEdit 3.0 图片本地化', icon: '🎨' },
  { href: '/ai-edit/translate', label: 'AI 翻译', desc: '腾讯云 TMT 中→俄翻译', icon: '🌐' },
  { href: '/listing', label: '批量上架', desc: '预填刊登，一键提交', icon: '📤' },
  { href: '/tracking', label: '店铺跟踪', desc: '销售仪表盘，预警通知', icon: '📈' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-lg">
        <h1 className="text-hero-display font-display mb-md">
          Ozon 跟卖全链路平台
        </h1>
        <p className="text-body text-ink-muted-48 max-w-2xl mb-xl">
          从榜单发现到店铺跟踪，一站式管理 Ozon 跨境跟卖全流程。
          支持 AI 改图（SeedEdit 3.0）+ AI 翻译（腾讯云 TMT），
          让商品本地化分钟级完成。
        </p>
        <div className="flex gap-md">
          <Link href="/register">
            <Button variant="primary" size="lg">免费注册</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">登录</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-lg py-xxl">
      <h2 className="text-display-md font-display mb-lg">工具箱</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
        {TOOLBOX_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card variant="light" hover padding="lg" className="h-full">
              <div className="text-3xl mb-sm">{item.icon}</div>
              <h3 className="text-title font-medium mb-xs">{item.label}</h3>
              <p className="text-caption text-ink-muted-48">{item.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
