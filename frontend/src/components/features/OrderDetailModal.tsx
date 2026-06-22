"use client";

import React, { useEffect, useState } from "react";
import { message, Modal, Spin } from "antd";
import { ExternalLink } from "lucide-react";

import { fetchOrderDetail, OrderDetail } from "@/lib/hooks/useOrders";
import { formatOrderStatus } from "@/lib/order-status";
import { formatSellerMoney, formatSellerPrice } from "@/lib/currency";

interface OrderDetailModalProps {
  open: boolean;
  storeId: string | null;
  postingNumber: string | null;
  settlementCurrency?: string;
  onClose: () => void;
  onShip?: (postingNumber: string) => void;
}

function formatDt(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-sm py-sm border-b border-hairline last:border-0">
      <span className="text-caption text-muted w-24 shrink-0">{label}</span>
      <span className="text-body flex-1 break-all">{value}</span>
    </div>
  );
}

export function OrderDetailModal({
  open,
  storeId,
  postingNumber,
  settlementCurrency = "RUB",
  onClose,
  onShip,
}: OrderDetailModalProps) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !storeId || !postingNumber) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchOrderDetail(storeId, postingNumber)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          message.error(err instanceof Error ? err.message : "加载订单详情失败");
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, storeId, postingNumber, onClose]);

  const ozonPostingUrl =
    detail?.fulfillment_type === "FBO"
      ? `https://seller.ozon.ru/app/postings/fbo/${detail.posting_number}`
      : `https://seller.ozon.ru/app/postings/fbs/${detail?.posting_number ?? ""}`;

  return (
    <Modal
      title={postingNumber ? `订单 ${postingNumber}` : "订单详情"}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      mask={{ closable: true }}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {detail && (
          <div className="space-y-lg">
            {detail.is_overdue && (
              <p className="text-caption text-accent-pink bg-accent-pink/5 rounded-md px-md py-sm">
                该订单已超时，请尽快处理
              </p>
            )}

            <div className="rounded-lg border border-hairline px-md">
              <InfoRow label="订单号" value={<span className="font-mono">{detail.posting_number}</span>} />
              <InfoRow label="Ozon 单号" value={detail.order_id} />
              <InfoRow
                label="状态"
                value={
                  <span className={detail.is_overdue ? "text-accent-pink" : ""}>
                    {formatOrderStatus(detail.status)}
                  </span>
                }
              />
              <InfoRow label="履约类型" value={detail.fulfillment_type} />
              <InfoRow label="创建时间" value={formatDt(detail.created_at)} />
              <InfoRow label="发货截止" value={formatDt(detail.shipment_date)} />
              <InfoRow label="打包时间" value={formatDt(detail.packed_at)} />
              <InfoRow label="发货时间" value={formatDt(detail.shipped_at)} />
              <InfoRow label="送达时间" value={formatDt(detail.delivered_at)} />
              <InfoRow label="订单金额" value={formatSellerMoney(detail.total_price, settlementCurrency)} />
              <InfoRow label="卖家备注" value={detail.seller_note} />
              <InfoRow label="最近同步" value={formatDt(detail.synced_at)} />
            </div>

            {detail.products.length > 0 && (
              <div>
                <p className="text-micro-cap text-muted mb-sm">商品明细</p>
                <div className="overflow-x-auto rounded-lg border border-hairline">
                  <table className="w-full text-left min-w-[480px]">
                    <thead>
                      <tr className="border-b border-hairline bg-surface-elevated">
                        <th className="px-md py-sm text-micro-cap text-muted">SKU</th>
                        <th className="px-md py-sm text-micro-cap text-muted">名称</th>
                        <th className="px-md py-sm text-micro-cap text-muted">数量</th>
                        <th className="px-md py-sm text-micro-cap text-muted">单价</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.products.map((p, i) => (
                        <tr key={`${p.sku ?? "item"}-${i}`} className="border-b border-hairline last:border-0">
                          <td className="px-md py-sm font-mono text-caption">{p.sku ?? "-"}</td>
                          <td className="px-md py-sm text-caption">{p.name ?? "-"}</td>
                          <td className="px-md py-sm">{p.quantity}</td>
                          <td className="px-md py-sm">{formatSellerPrice(p.price, settlementCurrency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detail.tracking_events.length > 0 && (
              <div>
                <p className="text-micro-cap text-muted mb-sm">物流轨迹</p>
                <div className="rounded-lg border border-hairline divide-y divide-hairline">
                  {[...detail.tracking_events].reverse().map((ev, i) => (
                    <div key={`${ev.at ?? "ev"}-${i}`} className="px-md py-sm flex flex-wrap gap-sm justify-between">
                      <span className="text-body">{formatOrderStatus(ev.status)}</span>
                      <span className="text-caption text-muted">{formatDt(ev.at)}</span>
                      {ev.tracking_number && (
                        <span className="w-full font-mono text-caption text-muted">
                          运单号：{ev.tracking_number}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-sm pt-xs">
              {detail.fulfillment_type === "FBS" && onShip && (
                <button
                  type="button"
                  className="text-caption text-accent-violet-mid hover:underline cursor-pointer"
                  onClick={() => {
                    onClose();
                    onShip(detail.posting_number);
                  }}
                >
                  发货
                </button>
              )}
              <a
                href={ozonPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-xs text-caption text-muted hover:text-ink"
              >
                在 Ozon 后台查看
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </Spin>
    </Modal>
  );
}
