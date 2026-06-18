/** 新品刊登 API */

import { apiClient } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface ListingJob {
  id: string;
  filename: string;
  status: string;
  total_items: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  finished_at: string | null;
}

export interface ListingJobDetail extends ListingJob {
  items: { id: string; offer_id: string; name: string; status: string; error_message: string | null }[];
}

export async function downloadListingTemplate() {
  const res = await fetch(`/api/v1/tracking/listing/template`, { credentials: "include" });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "listing_template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadListing(storeId: string, file: File) {
  const res = await apiClient.upload<ListingJob>(`/tracking/listing/upload?${storeQuery(storeId)}`, file);
  return res.data!;
}

export async function fetchListingJobs(storeId: string) {
  const res = await apiClient.get<ListingJob[]>(`/tracking/listing/jobs?${storeQuery(storeId)}`);
  return res.data ?? [];
}

export async function fetchListingJob(storeId: string, jobId: string) {
  const res = await apiClient.get<ListingJobDetail>(`/tracking/listing/jobs/${jobId}?${storeQuery(storeId)}`);
  return res.data!;
}
