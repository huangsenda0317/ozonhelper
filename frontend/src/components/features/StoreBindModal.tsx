"use client";

import React, { useEffect, useState } from "react";
import { message, Modal } from "antd";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { createStore } from "@/lib/hooks/useOrders";
import { ACTIVE_STORE_STORAGE_KEY } from "@/lib/store-context";

interface StoreBindModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

const FORM_ID = "store-bind-form";

export function StoreBindModal({
  open,
  onClose,
  onSuccess,
}: StoreBindModalProps) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setClientId("");
    setApiKey("");
    setShowApiKey(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createStore({
        name,
        client_id: clientId,
        api_key: apiKey,
      });
      message.success("店铺绑定成功");
      if (created?.id) {
        localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, created.id);
      }
      resetForm();
      onClose();
      await onSuccess();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "绑定失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="绑定 Ozon 店铺"
      open={open}
      onCancel={handleClose}
      destroyOnHidden
      maskClosable={!submitting}
      closable={!submitting}
      footer={
        <div className="flex justify-end gap-sm">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant="primary"
            type="submit"
            form={FORM_ID}
            loading={submitting}
          >
            绑定店铺
          </Button>
        </div>
      }
    >
      <p className="text-caption text-muted mb-lg">
        在 Ozon 卖家后台获取 Client-Id 与 Api-Key
      </p>
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-md">
        <div>
          <label
            htmlFor="store-bind-name"
            className="text-caption text-muted mb-xs block"
          >
            店铺名称
          </label>
          <input
            id="store-bind-name"
            className="w-full input-sentry px-md py-sm rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div>
          <label
            htmlFor="store-bind-client-id"
            className="text-caption text-muted mb-xs block"
          >
            Client-Id
          </label>
          <input
            id="store-bind-client-id"
            className="w-full input-sentry px-md py-sm rounded-md"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div>
          <label
            htmlFor="store-bind-api-key"
            className="text-caption text-muted mb-xs block"
          >
            Api-Key
          </label>
          <div className="relative">
            <input
              id="store-bind-api-key"
              className="w-full input-sentry px-md py-sm rounded-md pr-10"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-ink transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40"
              aria-label={showApiKey ? "隐藏 Api-Key" : "显示 Api-Key"}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
