"use client";

import React, { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import {
  downloadListingTemplate,
  fetchListingJob,
  fetchListingJobs,
  ListingJob,
  uploadListing,
} from "@/lib/hooks/useListing";

export default function ListingPage() {
  const { activeStoreId, dataRefreshKey } = useStoreContext();
  const [jobs, setJobs] = useState<ListingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchListingJob>> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!activeStoreId) return;
    setLoading(true);
    fetchListingJobs(activeStoreId)
      .then(setJobs)
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeStoreId, dataRefreshKey]);

  useEffect(() => {
    if (!activeStoreId || !detailId) return;
    fetchListingJob(activeStoreId, detailId).then(setDetail);
    const t = setInterval(() => fetchListingJob(activeStoreId, detailId).then(setDetail), 3000);
    return () => clearInterval(t);
  }, [activeStoreId, detailId]);

  const onUpload = async (file: File) => {
    if (!activeStoreId) return;
    setUploading(true);
    try {
      const job = await uploadListing(activeStoreId, file);
      setDetailId(job.id);
      load();
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="h-48 animate-pulse bg-surface-elevated rounded-lg" />;

  return (
    <div className="space-y-lg">
      <Card variant="default" padding="lg" className="border-dashed border-2 border-hairline text-center">
        <Upload className="h-8 w-8 mx-auto text-muted mb-md" />
        <p className="text-body mb-md">上传 Excel 批量刊登（最多 500 行）</p>
        <div className="flex justify-center gap-md">
          <Button variant="secondary" size="sm" onClick={downloadListingTemplate}>
            下载模板
          </Button>
          <Button variant="primary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "上传中…" : "选择文件"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </div>
      </Card>

      <Card variant="default" padding="none" className="overflow-hidden">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="border-b border-hairline bg-surface-elevated">
              <th className="px-lg py-md text-micro-cap text-muted">文件</th>
              <th className="px-lg py-md text-micro-cap text-muted">状态</th>
              <th className="px-lg py-md text-micro-cap text-muted">进度</th>
              <th className="px-lg py-md text-micro-cap text-muted">时间</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr
                key={j.id}
                className="border-b border-hairline hover:bg-surface-elevated/50 cursor-pointer"
                onClick={() => setDetailId(j.id)}
              >
                <td className="px-lg py-md">{j.filename}</td>
                <td className="px-lg py-md">{j.status}</td>
                <td className="px-lg py-md">
                  {j.success_count}/{j.total_items}
                </td>
                <td className="px-lg py-md text-caption text-muted">
                  {new Date(j.created_at).toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {detail && (
        <Card variant="default" padding="lg">
          <p className="text-heading-sm font-display mb-md">任务详情 · {detail.status}</p>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left min-w-[500px] text-caption">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="py-sm">offer_id</th>
                  <th className="py-sm">状态</th>
                  <th className="py-sm">错误</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id} className="border-b border-hairline">
                    <td className="py-sm">{it.offer_id}</td>
                    <td className="py-sm">{it.status}</td>
                    <td className="py-sm text-accent-pink">{it.error_message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
