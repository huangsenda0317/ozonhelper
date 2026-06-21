/** Ozon 商品 status_name / moderate_status / validation_status → 中文 */

/** 销售状态（status_name，Ozon 常返回俄文） */
const PRODUCT_STATUS_NAME_ZH: Record<string, string> = {
  // 俄文
  продается: "在售",
  "не продается": "不在售",
  "готов к продаже": "准备销售",
  "на модерации": "审核中",
  "не прошел модерацию": "审核未通过",
  "не прошёл модерацию": "审核未通过",
  "снят с продажи": "已下架",
  архивный: "已归档",
  "в архиве": "已归档",
  создается: "创建中",
  "создаётся": "创建中",
  создан: "已创建",
  ошибка: "错误",
  удален: "已删除",
  "удалён": "已删除",
  заблокирован: "已封禁",
  "ожидает исправлений": "待修正",
  // 英文（部分接口字段）
  selling: "在售",
  to_supply: "待供货",
  ready_to_supply: "准备供货",
  archived: "已归档",
  removed_from_sale: "已下架",
  moderation: "审核中",
  failed_moderation: "审核未通过",
  creating: "创建中",
  created: "已创建",
};

/** 审核状态 moderate_status */
const PRODUCT_MODERATE_STATUS_ZH: Record<string, string> = {
  approved: "已通过",
  pending: "待审核",
  in_moderation: "审核中",
  moderating: "审核中",
  rejected: "已拒绝",
  declined: "已拒绝",
  failed: "审核失败",
  not_moderated: "未审核",
  unknown: "未知",
};

/** 验证状态 validation_status */
const PRODUCT_VALIDATION_STATUS_ZH: Record<string, string> = {
  success: "验证通过",
  valid: "验证通过",
  failed: "验证失败",
  invalid: "验证失败",
  pending: "待验证",
  in_progress: "验证中",
  unknown: "未知",
};

/** 状态说明 status_description（常见俄文短语） */
const PRODUCT_STATUS_DESCRIPTION_ZH: Record<string, string> = {
  "товар продается": "商品在售",
  "товар не продается": "商品不在售",
  "товар на модерации": "商品审核中",
  "товар не прошел модерацию": "商品审核未通过",
  "товар не прошёл модерацию": "商品审核未通过",
  "товар снят с продажи": "商品已下架",
  "товар в архиве": "商品已归档",
  "не заполнены обязательные поля": "必填字段未填写",
  "не заполнены обязательные характеристики": "必填属性未填写",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "_");
}

function lookupExact(value: string, dict: Record<string, string>): string | null {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (dict[lower]) return dict[lower];
  const normalized = normalizeKey(trimmed);
  if (dict[normalized]) return dict[normalized];
  return null;
}

function lookupPartial(value: string, dict: Record<string, string>): string | null {
  const lower = value.trim().toLowerCase();
  for (const [key, zh] of Object.entries(dict)) {
    if (lower.includes(key)) return zh;
  }
  return null;
}

function translateStatus(
  value: string | null | undefined,
  exactDict: Record<string, string>,
  partialDict?: Record<string, string>,
): string {
  if (!value) return "-";
  const exact = lookupExact(value, exactDict);
  if (exact) return exact;
  if (partialDict) {
    const partial = lookupPartial(value, partialDict);
    if (partial) return partial;
  }
  return value;
}

export function formatProductStatusName(status: string | null | undefined): string {
  return translateStatus(status, PRODUCT_STATUS_NAME_ZH);
}

export function formatProductModerateStatus(status: string | null | undefined): string {
  return translateStatus(status, PRODUCT_MODERATE_STATUS_ZH);
}

export function formatProductValidationStatus(status: string | null | undefined): string {
  return translateStatus(status, PRODUCT_VALIDATION_STATUS_ZH);
}

export function formatProductStatusDescription(description: string | null | undefined): string {
  return translateStatus(description, PRODUCT_STATUS_DESCRIPTION_ZH, PRODUCT_STATUS_DESCRIPTION_ZH);
}

/** 筛选用：中文/俄文/英文关键词 → 可匹配的 status_name 片段 */
export const PRODUCT_STATUS_FILTER_OPTIONS = [
  { label: "全部", value: "" },
  { label: "在售", value: "Продается" },
  { label: "不在售", value: "Не продается" },
  { label: "审核中", value: "модерации" },
  { label: "已下架", value: "Снят" },
  { label: "已归档", value: "архив" },
] as const;
