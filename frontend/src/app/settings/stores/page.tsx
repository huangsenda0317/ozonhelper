"use client";

import React, { useState } from "react";
import { message, Popconfirm, Spin, Tooltip } from "antd";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StoreBindModal } from "@/components/features/StoreBindModal";
import { deleteStore, StoreSummary, verifyStore } from "@/lib/hooks/useOrders";
import { ACTIVE_STORE_STORAGE_KEY, useStoreContext } from "@/lib/store-context";

function StoreIconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center h-8 w-8 min-w-[32px] rounded-md shrink-0 bg-transparent hover:bg-surface-elevated transition-colors duration-200 cursor-pointer text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${
        danger ? "hover:text-accent-pink" : ""
      }`}
    >
      {children}
    </button>
  );
}

export default function StoresSettingsPage() {
  const { stores, loading: storesLoading, refreshStores } = useStoreContext();
  const [bindModalOpen, setBindModalOpen] = useState(false);

  const openBindModal = () => setBindModalOpen(true);

  const handleVerify = async (storeId: string) => {
    try {
      const r = await verifyStore(storeId);
      if (r?.valid) {
        message.success("凭证有效");
      } else {
        message.error(r?.reason ?? "凭证无效");
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "校验失败");
    }
  };

  const handleDelete = async (store: StoreSummary) => {
    try {
      await deleteStore(store.id);
      if (localStorage.getItem(ACTIVE_STORE_STORAGE_KEY) === store.id) {
        localStorage.removeItem(ACTIVE_STORE_STORAGE_KEY);
      }
      message.success("店铺已删除");
      await refreshStores(true, true);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-xxl py-xxl space-y-xl">
      <div>
        <p className="eyebrow-cap mb-sm">Settings</p>
        <h1 className="font-display text-heading-md text-ink">
          Ozon{" "}
          <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
            店铺管理
          </span>
        </h1>
        <p className="text-body text-muted mt-xs">
          在 Ozon 卖家后台获取 Client-Id 与 Api-Key，绑定后用于店铺跟踪与同步
        </p>
      </div>

      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between gap-md mb-md">
          <h2 className="text-heading-sm font-display text-ink">已绑定店铺</h2>
          <Button
            variant="primary"
            onClick={openBindModal}
            className="gap-sm shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            绑定店铺
          </Button>
        </div>
        <Spin spinning={storesLoading}>
          <div className="space-y-sm min-h-16">
            {!storesLoading &&
              stores.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-md border border-hairline rounded-lg"
                >
                  <div>
                    <p className="text-body font-medium">{s.name}</p>
                    <p className="text-caption text-muted">
                      最后同步：
                      {s.last_sync_at
                        ? new Date(s.last_sync_at).toLocaleString("zh-CN")
                        : "从未"}
                    </p>
                  </div>
                  <div className="flex items-center h-8 gap-sm shrink-0">
                    <Tooltip title="校验">
                      <span className="inline-flex">
                        <StoreIconButton
                          label="校验"
                          onClick={() => handleVerify(s.id)}
                        >
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        </StoreIconButton>
                      </span>
                    </Tooltip>
                    <Popconfirm
                      title={`确定删除店铺「${s.name}」？`}
                      description="将同时清除该店铺的所有同步商品、订单与预警数据，且不可恢复。"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(s)}
                    >
                      <Tooltip title="删除">
                        <span className="inline-flex">
                          <StoreIconButton label="删除" danger>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </StoreIconButton>
                        </span>
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            {!storesLoading && stores.length === 0 && (
              <div className="flex flex-col items-center gap-md py-lg text-center">
                <p className="text-caption text-muted">
                  暂无店铺，点击右上角绑定店铺
                </p>
                <Button
                  variant="secondary"
                  onClick={openBindModal}
                  className="gap-sm"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  绑定店铺
                </Button>
              </div>
            )}
          </div>
        </Spin>
      </Card>

      <StoreBindModal
        open={bindModalOpen}
        onClose={() => setBindModalOpen(false)}
        onSuccess={() => refreshStores(true)}
      />
    </div>
  );
}
