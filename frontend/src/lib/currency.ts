/** Ozon 平台金额展示统一使用俄罗斯卢布 */

export const RUB_SYMBOL = "₽";
export const RUB_CODE = "RUB";

/** 表头/标签后缀，如「当前价 (₽)」 */
export const RUB_SUFFIX = ` (${RUB_SYMBOL})`;

export interface FormatRubOptions {
  decimals?: number;
  fallback?: string;
  compact?: boolean;
}

function formatRubNumber(value: number, decimals: number): string {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 通用卢布格式化 */
export function formatRub(
  value: number | null | undefined,
  options: FormatRubOptions = {},
): string {
  const { decimals = 2, fallback = "-", compact = false } = options;
  if (value == null || Number.isNaN(value)) return fallback;
  if (compact) {
    if (value >= 1000) return `${RUB_SYMBOL}${(value / 1000).toFixed(0)}k`;
    return `${RUB_SYMBOL}${formatRubNumber(value, 0)}`;
  }
  return `${RUB_SYMBOL}${formatRubNumber(value, decimals)}`;
}

/** 商品价格：整数不补 .00，最多两位小数 */
export function formatRubPrice(value: number | null | undefined, fallback = "-"): string {
  if (value == null || Number.isNaN(value)) return fallback;
  const formatted = value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${RUB_SYMBOL}${formatted}`;
}

/** 财务金额：固定两位小数 */
export function formatRubMoney(value: number | null | undefined, fallback = "-"): string {
  return formatRub(value, { decimals: 2, fallback });
}

/** 图表轴紧凑格式 */
export function formatRubCompact(value: number): string {
  return formatRub(value, { compact: true });
}

/** 带货币字段时的售价展示（Ozon 默认卢布） */
export function formatRubWithCurrency(
  value: number | null | undefined,
  currency?: string | null,
  fallback = "-",
): string {
  if (value == null || Number.isNaN(value)) return fallback;
  if (currency && currency !== RUB_CODE && currency !== RUB_SYMBOL) {
    return `${currency} ${formatRubNumber(value, 2)}`;
  }
  return formatRubPrice(value);
}

/** 卖家结算价（CNY 店显示 ¥，RUB 店显示 ₽） */
export function formatSellerPrice(
  value: number | null | undefined,
  currency?: string | null,
  fallback = "-",
): string {
  if (value == null || Number.isNaN(value)) return fallback;
  const cur = (currency || RUB_CODE).toUpperCase();
  if (cur === "CNY") {
    const formatted = value.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `¥${formatted}`;
  }
  if (cur === "RUB") {
    return formatRubPrice(value);
  }
  return `${cur} ${formatRubNumber(value, 2)}`;
}

/** 商品列表/详情价格说明 */
export const SELLER_PRICE_NOTE =
  "价格为 Ozon 卖家结算货币（跨境店多为 CNY），非买家端卢布售价；Ozon API 暂不提供前台卢布价。";

/** 前台卢布价；estimated 或指数/手动换算时前缀 ≈ */
export function formatStorefrontRub(
  value: number | null | undefined,
  estimated = false,
  fallback = "-",
): string {
  if (value == null || Number.isNaN(value)) return fallback;
  const prefix = estimated ? "≈" : "";
  return `${prefix}${formatRubPrice(value)}`;
}

/** 前台卢布价 + 来源说明 */
export function storefrontRubHint(source?: string | null): string | null {
  switch (source) {
    case "ozon_marketing":
      return "Ozon 橱窗价";
    case "seller":
      return "卖家 RUB 定价";
    case "manual_rate":
      return "手动汇率";
    case "market_rate":
      return "市场汇率换算";
    default:
      return null;
  }
}
