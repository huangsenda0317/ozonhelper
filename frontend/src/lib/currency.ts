/** 卖家结算货币展示（CNY / USD / RUB） */

export const RUB_SYMBOL = "₽";
export const RUB_CODE = "RUB";
export const CNY_SYMBOL = "¥";
export const CNY_CODE = "CNY";
export const USD_SYMBOL = "$";
export const USD_CODE = "USD";

export const RUB_SUFFIX = ` (${RUB_SYMBOL})`;
export const CNY_SUFFIX = ` (${CNY_SYMBOL})`;
export const USD_SUFFIX = ` (${USD_SYMBOL})`;

export type SellerCurrencyCode = typeof CNY_CODE | typeof USD_CODE | typeof RUB_CODE | string;

export function normalizeSellerCurrency(currency?: string | null): string {
  return (currency || RUB_CODE).toUpperCase();
}

export function sellerCurrencySymbol(currency?: string | null): string {
  const cur = normalizeSellerCurrency(currency);
  if (cur === CNY_CODE) return CNY_SYMBOL;
  if (cur === USD_CODE) return USD_SYMBOL;
  if (cur === RUB_CODE) return RUB_SYMBOL;
  return cur;
}

export function sellerCurrencySuffix(currency?: string | null): string {
  return ` (${sellerCurrencySymbol(currency)})`;
}

export function sellerCurrencyName(currency?: string | null): string {
  const cur = normalizeSellerCurrency(currency);
  if (cur === CNY_CODE) return "人民币";
  if (cur === USD_CODE) return "美元";
  if (cur === RUB_CODE) return "卢布";
  return cur;
}

function formatAmountNumber(
  value: number,
  currency: string,
  { decimals, compact }: { decimals: number; compact?: boolean },
): string {
  if (compact && value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  const locale = currency === CNY_CODE ? "zh-CN" : currency === USD_CODE ? "en-US" : "ru-RU";
  const minDigits = currency === RUB_CODE && decimals === 0 ? 0 : 0;
  return value.toLocaleString(locale, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: decimals,
  });
}

/** 卖家结算价（商品/价格中心） */
export function formatSellerPrice(
  value: number | null | undefined,
  currency?: string | null,
  fallback = "-",
): string {
  if (value == null || Number.isNaN(value)) return fallback;
  const cur = normalizeSellerCurrency(currency);
  const formatted = formatAmountNumber(value, cur, { decimals: 2 });
  return `${sellerCurrencySymbol(cur)}${formatted}`;
}

/** 财务/看板金额：两位小数 */
export function formatSellerMoney(
  value: number | null | undefined,
  currency?: string | null,
  fallback = "-",
): string {
  if (value == null || Number.isNaN(value)) return fallback;
  const cur = normalizeSellerCurrency(currency);
  const formatted = formatAmountNumber(value, cur, { decimals: 2 });
  return `${sellerCurrencySymbol(cur)}${formatted}`;
}

/** 图表轴紧凑格式 */
export function formatSellerCompact(value: number, currency?: string | null): string {
  const cur = normalizeSellerCurrency(currency);
  const formatted = formatAmountNumber(value, cur, { decimals: 0, compact: true });
  return `${sellerCurrencySymbol(cur)}${formatted}`;
}

/** 价格中心列名 */
export function sellerPriceColumnLabel(currency?: string | null): string {
  const cur = normalizeSellerCurrency(currency);
  if (cur === CNY_CODE || cur === USD_CODE) return `价格${sellerCurrencySuffix(cur)}`;
  return `当前价${RUB_SUFFIX}`;
}

export function sellerBreakevenColumnLabel(currency?: string | null): string {
  return `保本价${sellerCurrencySuffix(currency)}`;
}

/** 带货币符号的指标标签，如「回款 (¥)」 */
export function sellerMetricLabel(name: string, currency?: string | null): string {
  return `${name}${sellerCurrencySuffix(currency)}`;
}

export function sellerPriceNote(currency?: string | null): string {
  const name = sellerCurrencyName(currency);
  return `价格为 Ozon 卖家结算货币（${name}），非买家端卢布售价；Ozon API 暂不提供前台卢布价。`;
}

/** @deprecated 使用 sellerPriceNote(currency) */
export const SELLER_PRICE_NOTE =
  "价格为 Ozon 卖家结算货币（跨境店多为 CNY），非买家端卢布售价；Ozon API 暂不提供前台卢布价。";

// --- 卢布专用（前台卢布估算等） ---

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

export function formatRubPrice(value: number | null | undefined, fallback = "-"): string {
  return formatSellerPrice(value, RUB_CODE, fallback);
}

export function formatRubMoney(value: number | null | undefined, fallback = "-"): string {
  return formatSellerMoney(value, RUB_CODE, fallback);
}

export function formatRubCompact(value: number): string {
  return formatSellerCompact(value, RUB_CODE);
}

export function formatRubWithCurrency(
  value: number | null | undefined,
  currency?: string | null,
  fallback = "-",
): string {
  return formatSellerPrice(value, currency, fallback);
}

export function formatStorefrontRub(
  value: number | null | undefined,
  estimated = false,
  fallback = "-",
): string {
  if (value == null || Number.isNaN(value)) return fallback;
  const prefix = estimated ? "≈" : "";
  return `${prefix}${formatRubPrice(value)}`;
}

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
