/** Ozon 订单 posting status → 中文（FBS/FBO，与 Seller API 枚举对齐） */
export const ORDER_STATUS_ZH: Record<string, string> = {
  awaiting_registration: "待注册",
  awaiting_approve: "待确认",
  awaiting_packaging: "待打包",
  awaiting_deliver: "待发货",
  acceptance_in_progress: "验收中",
  arbitration: "仲裁中",
  client_arbitration: "客户仲裁",
  delivering: "运输中",
  driver_pickup: "司机取货",
  delivered: "已送达",
  received: "已签收",
  cancelled: "已取消",
  not_accepted: "未接受",
  sent_by_seller: "卖家已发货",
};

/** Ozon 退货 status → 中文 */
export const RETURN_STATUS_ZH: Record<string, string> = {
  new: "新申请",
  approved: "已批准",
  rejected: "已拒绝",
  returning: "退货中",
  returned: "已退货",
  partiallyreturned: "部分退货",
  cancelled: "已取消",
  dispute: "争议中",
};

function lookupStatus(
  status: string,
  dict: Record<string, string>,
): string {
  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return dict[normalized] ?? dict[status.trim()] ?? status;
}

export function formatOrderStatus(status: string | null | undefined): string {
  if (!status) return "-";
  return lookupStatus(status, ORDER_STATUS_ZH);
}

export function formatReturnStatus(status: string | null | undefined): string {
  if (!status) return "-";
  return lookupStatus(status, RETURN_STATUS_ZH);
}
