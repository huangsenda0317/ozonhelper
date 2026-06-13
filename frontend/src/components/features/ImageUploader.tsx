'use client';

import React, { useRef } from 'react';
import { Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';

import { apiClient, ApiError } from '@/lib/api-client';

export interface UploadedImage {
  object_name: string;
  url: string;
  preview: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxCount?: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function toFileList(images: UploadedImage[]): UploadFile[] {
  return images.map((img) => ({
    uid: img.object_name,
    name: img.object_name.split('/').pop() || img.object_name,
    status: 'done' as const,
    url: img.preview,
    thumbUrl: img.preview,
  }));
}

export function ImageUploader({ images, onChange, maxCount = 10 }: ImageUploaderProps) {
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const uploadingCountRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve());

  const fileList = toFileList(images);

  const appendImage = (newImage: UploadedImage) => {
    const updated = [...imagesRef.current, newImage];
    imagesRef.current = updated;
    onChange(updated);
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error('仅支持 JPG、PNG、WebP 格式');
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('单文件不超过 10MB');
      return Upload.LIST_IGNORE;
    }
    if (imagesRef.current.length + uploadingCountRef.current >= maxCount) {
      message.error(`最多上传 ${maxCount} 张图片`);
      return Upload.LIST_IGNORE;
    }
    uploadingCountRef.current += 1;
    return true;
  };

  const customRequest: UploadProps['customRequest'] = (options) => {
    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;

    uploadQueueRef.current = uploadQueueRef.current
      .then(async () => {
        const preview = URL.createObjectURL(uploadFile);
        const response = await apiClient.upload<{ object_name: string; url: string }>(
          '/ai/upload-image',
          uploadFile,
        );

        if (response.success && response.data) {
          appendImage({
            object_name: response.data.object_name,
            url: response.data.url,
            preview,
          });
          onSuccess?.(response.data);
        } else {
          throw new Error('上传失败');
        }
      })
      .catch((err) => {
        const msg = err instanceof ApiError ? err.message : '上传失败，请稍后重试';
        message.error(msg);
        onError?.(err as Error);
      })
      .finally(() => {
        uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1);
      });
  };

  const handleRemove: UploadProps['onRemove'] = (file) => {
    const removed = imagesRef.current.find((img) => img.object_name === file.uid);
    if (removed?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(removed.preview);
    }
    onChange(imagesRef.current.filter((img) => img.object_name !== file.uid));
    return true;
  };

  return (
    <div className="aspect-square w-full overflow-y-auto border border-gray-200 rounded-lg p-sm bg-canvas">
      <Upload
        listType="picture-card"
        fileList={fileList}
        multiple
        customRequest={customRequest}
        beforeUpload={beforeUpload}
        onRemove={handleRemove}
        maxCount={maxCount}
        accept=".jpg,.jpeg,.png,.webp"
        className="ai-edit-upload [&_.ant-upload-list]:flex-wrap [&_.ant-upload-select]:!m-0"
      >
        {fileList.length >= maxCount ? null : (
          <button type="button" className="border-0 bg-transparent cursor-pointer text-ink-muted-48">
            <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <div className="mt-xs text-caption">上传</div>
          </button>
        )}
      </Upload>
    </div>
  );
}
