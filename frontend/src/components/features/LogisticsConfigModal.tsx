"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "antd";

import { Button } from "@/components/ui/Button";
import { LogisticsConfig } from "@/lib/hooks/useLogisticsAlerts";

const NODE_LABELS: Record<string, string> = {
  pending_pack: "待打包",
  pending_pickup: "待揽收",
  transport_stall: "运输停滞",
  pending_delivery: "待签收",
  abnormal: "异常滞留",
};

function ConfigSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`switch-sentry ${checked ? "switch-sentry-on" : "switch-sentry-off"}`}
    >
      <span className="switch-sentry-knob" aria-hidden="true" />
    </button>
  );
}

interface LogisticsConfigModalProps {
  open: boolean;
  config: LogisticsConfig[];
  onClose: () => void;
  onSave: (items: LogisticsConfig[]) => Promise<void>;
}

export function LogisticsConfigModal({
  open,
  config,
  onClose,
  onSave,
}: LogisticsConfigModalProps) {
  const [draft, setDraft] = useState<LogisticsConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(config.map((item) => ({ ...item })));
      setSaveMessage("");
    }
  }, [open, config]);

  const updateDraft = (index: number, patch: Partial<LogisticsConfig>) => {
    setDraft((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setSaveMessage("");
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await onSave(draft);
      onClose();
    } catch {
      setSaveMessage("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="节点超时阈值"
      open={open}
      onCancel={handleClose}
      destroyOnHidden
      mask={{ closable: !saving }}
      closable={!saving}
      width={560}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-sm">
          {saveMessage && (
            <p
              className={`text-caption mr-auto ${
                saveMessage.includes("失败") ? "text-accent-pink" : "text-muted"
              }`}
              role="status"
            >
              {saveMessage}
            </p>
          )}
          <Button variant="ghost" type="button" onClick={handleClose} disabled={saving}>
            取消
          </Button>
          <Button variant="primary" type="button" loading={saving} onClick={handleSave}>
            保存配置
          </Button>
        </div>
      }
    >
      <p className="text-caption text-muted mb-lg">
        启用对应节点后，订单在该状态停留超过设定天数时将自动生成物流预警。
      </p>

      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-hairline bg-surface-elevated">
              <th className="px-lg py-md text-micro-cap text-muted font-medium">物流节点</th>
              <th className="px-lg py-md text-micro-cap text-muted font-medium text-center">
                启用
              </th>
              <th className="px-lg py-md text-micro-cap text-muted font-medium">超时天数</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((c, i) => {
              const label = NODE_LABELS[c.node_type] ?? c.node_type;
              return (
                <tr
                  key={c.node_type}
                  className={`border-b border-hairline last:border-b-0 transition-opacity duration-200 ${
                    c.enabled ? "text-ink" : "opacity-60"
                  }`}
                >
                  <td className="px-lg py-md">
                    <span className="text-body font-medium">{label}</span>
                  </td>
                  <td className="px-lg py-md">
                    <div className="flex justify-center">
                      <ConfigSwitch
                        checked={c.enabled}
                        label={`${label}预警`}
                        onChange={(enabled) => updateDraft(i, { enabled })}
                      />
                    </div>
                  </td>
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        disabled={!c.enabled}
                        value={c.threshold_days}
                        onChange={(e) =>
                          updateDraft(i, {
                            threshold_days: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        aria-label={`${label}超时天数`}
                        className="input-sentry w-20 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-caption text-muted shrink-0">天</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
