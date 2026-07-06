import { calcAttributeCompleteness } from "./utils";
import type { ProcessingOrder } from "./types";

const now = Date.now();

function seedOrder(partial: Omit<ProcessingOrder, "attribute_completeness">): ProcessingOrder {
  const order = { ...partial, attribute_completeness: 0 };
  order.attribute_completeness = calcAttributeCompleteness(order);
  return order;
}

/** localStorage 为空时注入 demo 加工单 */
export const MOCK_PROCESSING_SEED: ProcessingOrder[] = [
  seedOrder({
    id: "proc-seed-1",
    collection_item_id: "seed-2",
    sku: "1492227600",
    name: "斯维托复印纸，5张A4规格，500页",
    photo_url: null,
    product_url: "https://www.ozon.ru/product/1492227600",
    source_platform: "OZON",
    title_zh: "斯维托 A4 复印纸 500张/包 办公用纸",
    tags_zh: ["办公", "复印纸"],
    description_zh: "高品质 A4 复印纸，500张/包，适合办公与家用。",
    category_path_zh: "办公用品 / 纸张",
    attributes: [{ name: "规格", value: "A4" }],
    spec_mode: "shared",
    specs: [{ id: "s1", name: "默认规格", images: [] }],
    images: [],
    status: "pool",
    ai_optimized_at: null,
    listed_to_management: false,
    current_price: 3473.82,
    brand: "Chappi",
    seller_name: "Ozon",
    created_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
  }),
  seedOrder({
    id: "proc-seed-2",
    collection_item_id: "seed-1",
    sku: "2811310229",
    name: "Xiaomi Smartphone Redmi 15 Rostest (EAC) 8/256 GB, black",
    photo_url: "https://ir-21.ozonru.cn/s3/multimedia-1-l/8376454785.jpg",
    product_url: "https://www.ozon.ru/product/2811310229",
    source_platform: "OZON",
    title_zh: "小米 Redmi 15 智能手机 8GB+256GB 黑色 EAC认证",
    tags_zh: ["手机", "小米", "热销"],
    description_zh:
      "小米 Redmi 15 智能手机，8GB 运行内存 + 256GB 存储，EAC 认证，适合俄罗斯市场。",
    category_path_zh: "电子产品 / 智能手机",
    attributes: [
      { name: "内存", value: "8GB" },
      { name: "存储", value: "256GB" },
    ],
    spec_mode: "per_spec",
    specs: [
      { id: "black", name: "黑色", images: [] },
      { id: "white", name: "白色", images: [] },
    ],
    images: ["https://ir-21.ozonru.cn/s3/multimedia-1-l/8376454785.jpg"],
    status: "finished",
    ai_optimized_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    listed_to_management: false,
    current_price: 36712.14,
    brand: "Xiaomi",
    seller_name: "Ozon",
    created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
  }),
];
