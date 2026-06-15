/** 店铺跟踪 API 类型与请求封装 */

import { apiClient, ApiError } from '@/lib/api-client';

export interface TrackingProductSummary {
  product_id: string;
  offer_id: string;
  sku: string | null;
  name: string;
  price: number | null;
  currency: string;
  stock_present: number;
  status_name: string | null;
  primary_image_url: string | null;
  updated_at: string | null;
}

export interface TrackingProductDetail {
  product_id: string;
  offer_id: string;
  sku: string | null;
  name: string;
  barcode: string | null;
  price: number | null;
  old_price: number | null;
  min_price: number | null;
  currency: string;
  stock_present: number;
  stock_reserved: number;
  has_stock: boolean;
  status_name: string | null;
  status_description: string | null;
  moderate_status: string | null;
  validation_status: string | null;
  primary_image: string | null;
  images: string[];
  created_at: string | null;
  updated_at: string | null;
  ozon_url: string | null;
}

export interface TrackingListParams {
  search?: string;
  visibility?: string;
  status?: string;
  has_stock?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
  refresh?: boolean;
}

export interface TrackingListResult {
  items: TrackingProductSummary[];
  total: number;
  page: number;
  limit: number;
  cachedAt: string | null;
}

function buildQuery(params: TrackingListParams): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.visibility) qs.set('visibility', params.visibility);
  if (params.status) qs.set('status', params.status);
  if (params.has_stock !== undefined) qs.set('has_stock', String(params.has_stock));
  if (params.sort_by) qs.set('sort_by', params.sort_by);
  if (params.sort_order) qs.set('sort_order', params.sort_order);
  if (params.refresh) qs.set('refresh', 'true');
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));
  return qs.toString();
}

export async function fetchTrackingProducts(
  params: TrackingListParams = {},
): Promise<TrackingListResult> {
  const response = await apiClient.get<TrackingProductSummary[]>(
    `/tracking/products?${buildQuery(params)}`,
  );
  return {
    items: response.data ?? [],
    total: response.meta?.total ?? 0,
    page: response.meta?.page ?? params.page ?? 1,
    limit: response.meta?.limit ?? params.limit ?? 20,
    cachedAt: response.meta?.cached_at ?? null,
  };
}

export async function fetchTrackingProductDetail(
  productId: string,
): Promise<TrackingProductDetail> {
  const response = await apiClient.get<TrackingProductDetail>(
    `/tracking/products/${productId}`,
  );
  if (!response.data) {
    throw new ApiError('PRODUCT_NOT_FOUND', '商品未找到', 404);
  }
  return response.data;
}

export function getTrackingErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'OZON_NOT_CONFIGURED') {
      return 'Ozon API 未配置，请在 backend/.env 中设置 OZON_CLIENT_ID 与 OZON_API_KEY 后重启后端';
    }
    if (err.code === 'OZON_AUTH_FAILED') {
      return 'Ozon API 认证失败，请检查 Client-Id 与 Api-Key 是否正确';
    }
    if (err.code === 'OZON_RATE_LIMIT') {
      return 'Ozon API 限流，请稍后重试';
    }
    return err.message;
  }
  return '加载失败，请稍后重试';
}
