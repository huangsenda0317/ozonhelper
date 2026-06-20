"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  Package,
  Coins,
  Wand2,
  Languages,
  Upload,
  TrendingUp,
  Bot,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const TOOLBOX_ITEMS: {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  bento?: "wide";
}[] = [
  {
    href: "/tracking",
    label: "店铺跟踪",
    desc: "ERP 工作台：商品、库存、订单、预警",
    icon: TrendingUp,
    bento: "wide",
  },
  {
    href: "/rankings",
    label: "榜单发现",
    desc: "浏览 Ozon 排行榜，锁定潜力商品",
    icon: BarChart3,
  },
  {
    href: "/selection-pool",
    label: "选品池",
    desc: "管理候选商品，批量操作",
    icon: ClipboardList,
  },
  {
    href: "/products",
    label: "已采集商品",
    desc: "查看完整字段，去重管理",
    icon: Package,
  },
  {
    href: "/sourcing",
    label: "1688 比价",
    desc: "搜索货源，计算毛利率",
    icon: Coins,
  },
  {
    href: "/ai-edit",
    label: "AI 改图",
    desc: "SeedEdit 3.0 图片本地化",
    icon: Wand2,
  },
  {
    href: "/ai-qa",
    label: "AI 问答",
    desc: "DeepSeek 查询店铺订单与库存",
    icon: Bot,
  },
  {
    href: "/ai-edit/translate",
    label: "AI 翻译",
    desc: "腾讯云 TMT 中→俄翻译",
    icon: Languages,
  },
  {
    href: "/listing",
    label: "批量上架",
    desc: "预填刊登，一键提交",
    icon: Upload,
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const cardVariant = isDark ? "feature-dark" : "default";

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-xxl">
        <p className="eyebrow-cap mb-sm">Ozon 跨境跟卖</p>
        <h1 className="font-display font-bold text-display-large text-ink mb-md max-w-3xl leading-tight">
          全链路{" "}
          <span className="bg-accent-lime text-ink-deep px-md rounded-xs">
            运营
          </span>{" "}
          平台
        </h1>
        <p className="text-body-lg text-body max-w-2xl mb-xl">
          从榜单发现到店铺跟踪，一站式管理 Ozon 跨境跟卖全流程。支持 AI
          改图（SeedEdit 3.0）+ AI 翻译（腾讯云 TMT），让商品本地化分钟级完成。
        </p>
        <div className="flex flex-wrap justify-center gap-md">
          <Link href="/register" className="cursor-pointer">
            {/* <Button variant="ghost" size="lg">
              免费注册
            </Button> */}
          </Link>
          <Link href="/login" className="cursor-pointer">
            <Button variant="primary" size="lg">
              登录
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="mb-xl">
        <p className="eyebrow-cap mb-sm">工作台</p>
        <h1 className="font-display font-bold text-heading-md text-ink">
          工具箱
        </h1>
        <p className="text-caption text-body mt-xs">
          跟卖全链路功能入口，点击进入对应模块
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-lg">
        {TOOLBOX_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`cursor-pointer focus-visible:outline-offset-4 ${
                item.bento === "wide" ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <Card
                variant={cardVariant}
                hover
                padding="lg"
                className="h-full transition-colors duration-200"
              >
                <Icon
                  className="h-8 w-8 text-accent-violet-mid mb-sm"
                  aria-hidden="true"
                />
                <h3 className="text-heading-sm font-medium mb-xs text-inherit">
                  {item.label}
                </h3>
                <p
                  className={`text-caption ${isDark ? "text-on-dark-muted" : "text-muted"}`}
                >
                  {item.desc}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
