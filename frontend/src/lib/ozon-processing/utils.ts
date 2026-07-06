import type { CollectionItem } from "@/lib/ozon-collection/types";

import type {
  ProcessingFilters,
  ProcessingOrder,
  ProcessingStatus,
} from "./types";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function calcAttributeCompleteness(order: Pick<
  ProcessingOrder,
  "title_zh" | "description_zh" | "tags_zh"
>): number {
  let score = 0;
  if (order.title_zh.trim()) score += 40;
  if (order.description_zh.trim()) score += 40;
  if (order.tags_zh.length > 0) score += 20;
  return score;
}

export function filterProcessingOrders(
  orders: ProcessingOrder[],
  status: ProcessingStatus,
  filters: ProcessingFilters,
): ProcessingOrder[] {
  return orders.filter((order) => {
    if (order.status !== status) return false;

    if (filters.keyword.trim()) {
      const kw = filters.keyword.trim().toLowerCase();
      const hay = [order.title_zh, order.name, order.sku, order.brand]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    if (filters.source_platform !== "all") {
      if (order.source_platform !== filters.source_platform) return false;
    }

    if (filters.created_time !== "all") {
      const created = new Date(order.created_at);
      const now = new Date();
      const todayStart = startOfDay(now);

      if (filters.created_time === "today") {
        if (created < todayStart) return false;
      } else if (filters.created_time === "yesterday") {
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        if (created < yesterdayStart || created >= todayStart) return false;
      } else if (filters.created_time === "last7days") {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        if (created < weekStart) return false;
      }
    }

    return true;
  });
}

export function statusLabel(status: ProcessingStatus): string {
  const map: Record<ProcessingStatus, string> = {
    pool: "加工池",
    processing: "加工中",
    finished: "加工成品",
    failed: "加工失败",
  };
  return map[status];
}

export function mockOptimizeCopy(order: ProcessingOrder): Pick<
  ProcessingOrder,
  "title_zh" | "tags_zh" | "description_zh"
> {
  const base = order.name || order.sku;
  const title = order.title_zh.trim()
    ? `${order.title_zh.replace(/[【】]/g, "")}【热销优选】`
    : `【精选】${base} 高品质跟卖款`;

  const tags = order.tags_zh.length
    ? Array.from(new Set([...order.tags_zh, "热销", "跟卖", "优质"]))
    : ["热销", "跟卖", "优质", order.source_platform === "OZON" ? "OZON爆款" : "1688货源"];

  const description = order.description_zh.trim()
    ? `${order.description_zh}\n\n✅ 品质保障，快速发货\n✅ 适合 Ozon 俄罗斯市场跟卖`
    : `【${base}】\n\n清晰准确地描述商品核心属性：材质优良、做工精致、性价比高。适合俄罗斯市场消费者需求，支持快速发货与售后保障。${order.category_path_zh ? `\n\n类目：${order.category_path_zh}` : ""}`;

  return { title_zh: title, tags_zh: tags.slice(0, 8), description_zh: description };
}

export function canJoinListing(order: ProcessingOrder): boolean {
  return order.title_zh.trim().length > 0;
}

export function mapCollectionToProcessingOrder(item: CollectionItem): ProcessingOrder {
  const now = new Date().toISOString();
  const draft: ProcessingOrder = {
    id: `proc-${item.id}-${Date.now()}`,
    collection_item_id: item.id,
    sku: item.sku,
    name: item.name,
    photo_url: item.photo_url,
    product_url: item.product_url,
    source_platform: item.source_platform,
    title_zh: item.collection_name || item.name,
    tags_zh: [...item.tags],
    description_zh: "",
    category_path_zh: item.category_path_zh,
    attributes: [],
    spec_mode: "shared",
    specs: [{ id: "default", name: "默认规格", images: [] }],
    images: item.photo_url ? [item.photo_url] : [],
    status: "pool",
    attribute_completeness: 0,
    ai_optimized_at: null,
    listed_to_management: false,
    current_price: item.current_price,
    brand: item.brand,
    seller_name: item.seller_name,
    created_at: now,
    updated_at: now,
  };
  draft.attribute_completeness = calcAttributeCompleteness(draft);
  return draft;
}
