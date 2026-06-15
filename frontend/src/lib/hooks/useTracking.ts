/** 店铺跟踪 API 类型与请求封装 */

import { apiClient, ApiError } from '@/lib/api-client';
import { storeQuery } from '@/lib/store-context';

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
  ordered_units: number;
  hits_view: number;
  conversion_rate: number | null;
  synced_at: string | null;
  is_exception: boolean;
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
  ordered_units: number;
  hits_view: number;
  conversion_rate: number | null;
  is_exception: boolean;
  exception_reason: string | null;
  synced_at: string | null;
}

export interface TrackingListParams {
  store_id?: string;
  search?: string;
  visibility?: string;
  status?: string;
  has_stock?: boolean;
  is_exception?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
  refresh?: boolean;
  realtime?: boolean;
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
  if (params.store_id) qs.set('store_id', params.store_id);
  if (params.search) qs.set('search', params.search);
  if (params.visibility) qs.set('visibility', params.visibility);
  if (params.status) qs.set('status', params.status);
  if (params.has_stock !== undefined) qs.set('has_stock', String(params.has_stock));
  if (params.is_exception !== undefined) qs.set('is_exception', String(params.is_exception));
  if (params.sort_by) qs.set('sort_by', params.sort_by);
  if (params.sort_order) qs.set('sort_order', params.sort_order);
  if (params.refresh) qs.set('refresh', 'true');
  if (params.realtime) qs.set('realtime', 'true');
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
  storeId?: string,
  realtime = false,
): Promise<TrackingProductDetail> {
  const qs = new URLSearchParams();
  if (storeId) qs.set('store_id', storeId);
  if (realtime) qs.set('realtime', 'true');
  const q = qs.toString();
  const response = await apiClient.get<TrackingProductDetail>(
    `/tracking/products/${productId}${q ? `?${q}` : ''}`,
  );
  if (!response.data) {
    throw new ApiError('PRODUCT_NOT_FOUND', '商品未找到', 404);
  }
  return response.data;
}

export async function batchProductVisibility(
  storeId: string,
  productIds: string[],
  action: 'archive' | 'unarchive',
) {
  const res = await apiClient.post<{ product_id: string; success: boolean }[]>(
    `/tracking/products/batch-visibility?${storeQuery(storeId)}`,
    { product_ids: productIds, action },
  );
  return res.data ?? [];
}

export function getTrackingErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'OZON_NOT_CONFIGURED') {
      return '尚未绑定 Ozon 店铺，请前往设置页添加店铺';
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
