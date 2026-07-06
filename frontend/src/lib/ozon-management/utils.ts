import type { ListingFilters, ListingItem } from "./types";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function filterListingItems(
  items: ListingItem[],
  filters: ListingFilters,
): ListingItem[] {
  return items.filter((item) => {
    if (item.listing_status !== "pending") return false;

    if (filters.keyword.trim()) {
      const kw = filters.keyword.trim().toLowerCase();
      const hay = [item.title_zh, item.sku, item.brand, item.seller_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    if (filters.source_status !== "all") {
      if (item.source_status !== filters.source_status) return false;
    }

    if (filters.shop_id !== "all") {
      if (item.shop_id !== filters.shop_id) return false;
    }

    if (filters.joined_time !== "all") {
      const joined = new Date(item.joined_at);
      const now = new Date();
      const todayStart = startOfDay(now);

      if (filters.joined_time === "today") {
        if (joined < todayStart) return false;
      } else if (filters.joined_time === "yesterday") {
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        if (joined < yesterdayStart || joined >= todayStart) return false;
      } else if (filters.joined_time === "last7days") {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        if (joined < weekStart) return false;
      }
    }

    return true;
  });
}

export function mapProcessingToListing(
  order: import("@/lib/ozon-processing/types").ProcessingOrder,
): ListingItem {
  const now = new Date().toISOString();
  return {
    id: `listing-${order.id}-${Date.now()}`,
    processing_order_id: order.id,
    collection_item_id: order.collection_item_id,
    sku: order.sku,
    title_zh: order.title_zh,
    photo_url: order.photo_url,
    product_url: order.product_url,
    current_price: order.current_price,
    brand: order.brand,
    seller_name: order.seller_name,
    source_status: "processed",
    shop_id: "shop-1",
    shop_name: "Ozon 主店",
    listing_status: "pending",
    listed_at: null,
    tags: [...order.tags_zh],
    category_path_zh: order.category_path_zh,
    description_zh: order.description_zh,
    joined_at: now,
    page_views: Math.floor(Math.random() * 500),
    stock: Math.floor(Math.random() * 100) + 10,
  };
}
