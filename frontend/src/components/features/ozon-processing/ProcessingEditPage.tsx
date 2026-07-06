"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal, message } from "antd";
import { ArrowLeft, ImageIcon, PackagePlus, RotateCcw, Save } from "lucide-react";

import { ProcessingAiBanner } from "@/components/features/ozon-processing/ProcessingAiBanner";
import { Button } from "@/components/ui/Button";
import { useCollection } from "@/lib/ozon-collection/collection-context";
import { useManagement } from "@/lib/ozon-management/management-context";
import { useProcessing } from "@/lib/ozon-processing/processing-context";
import type { ProcessingOrder, SpecMode } from "@/lib/ozon-processing/types";
import { canJoinListing } from "@/lib/ozon-processing/utils";

interface ProcessingEditPageProps {
  orderId: string;
}

export function ProcessingEditPage({ orderId }: ProcessingEditPageProps) {
  const router = useRouter();
  const {
    getOrderById,
    updateOrder,
    removeOrders,
    setOrderStatus,
    markListedToManagement,
    optimizeCopy,
    optimizingId,
  } = useProcessing();
  const { createFromProcessing } = useManagement();
  const { setProcessingStatus } = useCollection();

  const order = getOrderById(orderId);
  const [draft, setDraft] = useState<ProcessingOrder | null>(order ?? null);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (order) {
      setDraft(order);
      setTagsInput(order.tags_zh.join(", "));
    }
  }, [order]);

  if (!order || !draft) {
    return (
      <div className="space-y-md">
        <p className="text-muted">加工单不存在或已删除</p>
        <Link href="/ozon-assistant/processing" className="text-accent-violet-mid hover:underline">
          返回加工列表
        </Link>
      </div>
    );
  }

  const optimizing = optimizingId === orderId;

  const handleSave = () => {
    const tags = tagsInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    updateOrder(orderId, {
      title_zh: draft.title_zh,
      description_zh: draft.description_zh,
      tags_zh: tags,
      spec_mode: draft.spec_mode,
      category_path_zh: draft.category_path_zh,
    });
    message.success("保存成功");
  };

  const handleOptimize = async () => {
    try {
      const updated = await optimizeCopy(orderId);
      setDraft(updated);
      setTagsInput(updated.tags_zh.join(", "));
      message.success("AI 优化完成，请核对后保存");
    } catch {
      message.error("AI 优化失败，请稍后重试");
    }
  };

  const handleJoinListing = () => {
    if (!canJoinListing(draft)) {
      message.warning("请先填写商品标题");
      return;
    }
    handleSave();
    if (draft.status !== "finished") {
      setOrderStatus([orderId], "finished");
    }
    const updated = { ...draft, status: "finished" as const };
    const { created } = createFromProcessing([updated]);
    if (created.length) {
      markListedToManagement([orderId], true);
      message.success("已加入待上架，请前往「商品管理」查看");
    } else {
      message.info("该商品已在待上架列表中");
    }
  };

  const handleRecreate = () => {
    Modal.confirm({
      title: "重新创建加工单？",
      content: "将重置为加工池状态，已填写的文案会保留。",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        setOrderStatus([orderId], "pool");
        markListedToManagement([orderId], false);
        setDraft({ ...draft, status: "pool" });
        message.success("已重新创建加工单");
      },
    });
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "确认删除该加工单？",
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        removeOrders([orderId]);
        setProcessingStatus([order.collection_item_id], "pending");
        message.success("已删除");
        router.push("/ozon-assistant/processing");
      },
    });
  };

  const setSpecMode = (mode: SpecMode) => {
    setDraft({ ...draft, spec_mode: mode });
  };

  return (
    <div className="space-y-lg pb-xxl">
      <nav className="flex items-center gap-sm text-caption text-muted">
        <Link
          href="/ozon-assistant/processing"
          className="inline-flex items-center gap-xs hover:text-ink transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          商品加工
        </Link>
        <span>/</span>
        <span className="text-ink">编辑加工</span>
      </nav>

      <ProcessingAiBanner onOptimize={handleOptimize} optimizing={optimizing} />

      <div className="flex flex-wrap gap-sm">
        <Button variant="primary" size="sm" onClick={handleSave}>
          <Save className="h-4 w-4" aria-hidden="true" />
          保存信息
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleJoinListing}
          disabled={!canJoinListing(draft)}
        >
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          加入待上架
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRecreate}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          重新创建加工单
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-accent-pink">
          删除
        </Button>
      </div>

      <section className="rounded-xl border border-hairline bg-surface-card p-lg space-y-md">
        <h2 className="text-body font-medium text-ink">基本信息</h2>
        <div className="space-y-md max-w-2xl">
          <div className="flex flex-col gap-xs">
            <label htmlFor="title_zh" className="text-caption text-muted">
              商品标题（中文）
            </label>
            <input
              id="title_zh"
              type="text"
              value={draft.title_zh}
              onChange={(e) => setDraft({ ...draft, title_zh: e.target.value })}
              placeholder="请输入商品中文标题"
              className="input-sentry w-full"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label htmlFor="tags_zh" className="text-caption text-muted">
              商品标签（中文）
            </label>
            <input
              id="tags_zh"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="输入标签，逗号分隔"
              className="input-sentry w-full"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label htmlFor="description_zh" className="text-caption text-muted">
              商品描述（中文）
            </label>
            <textarea
              id="description_zh"
              value={draft.description_zh}
              onChange={(e) => setDraft({ ...draft, description_zh: e.target.value })}
              placeholder="清晰准确地描述商品核心属性"
              rows={6}
              className="input-sentry w-full resize-y min-h-[8rem]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-hairline bg-surface-card p-lg space-y-md">
        <h2 className="text-body font-medium text-ink">类目与属性</h2>
        <p className="text-caption text-muted">
          {draft.category_path_zh || "该类目的属性还没有准备好（mock）"}
        </p>
      </section>

      <section className="rounded-xl border border-hairline bg-surface-card p-lg space-y-md">
        <h2 className="text-body font-medium text-ink">规格配置</h2>
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={() => setSpecMode("shared")}
            className={`px-md py-sm text-caption rounded-md cursor-pointer transition-colors duration-200 ${
              draft.spec_mode === "shared" ? "nav-tab-active" : "interactive-muted-soft"
            }`}
          >
            所有规格共用一套图
          </button>
          <button
            type="button"
            onClick={() => setSpecMode("per_spec")}
            className={`px-md py-sm text-caption rounded-md cursor-pointer transition-colors duration-200 ${
              draft.spec_mode === "per_spec" ? "nav-tab-active" : "interactive-muted-soft"
            }`}
          >
            每个规格独立一套图
          </button>
        </div>
        <ul className="text-caption text-muted space-y-1">
          {draft.specs.map((s) => (
            <li key={s.id}>规格：{s.name}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-hairline bg-surface-card p-lg space-y-md">
        <h2 className="text-body font-medium text-ink">商品图片素材</h2>
        <div className="flex flex-wrap gap-md">
          {draft.images.length > 0 ? (
            draft.images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`素材 ${i + 1}`}
                className="h-24 w-24 rounded-lg object-cover bg-surface-elevated"
              />
            ))
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-hairline bg-surface-elevated">
              <ImageIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            </div>
          )}
        </div>
        <p className="text-caption text-muted">图片 AI 改图功能开发中，首期展示占位</p>
      </section>
    </div>
  );
}
