'use client';

import React, { useEffect, useState } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import { FreeMode, Thumbs } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import { Button } from '@/components/ui/Button';

import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/thumbs';

export interface ImagePreviewProps {
  images: string[];
  title?: string;
  compareImages?: string[];
  initialIndex?: number;
  onClose: () => void;
}

/** @deprecated 使用 ImagePreviewProps */
export interface ImageCompareProps {
  processedImages: string[];
  inputImages?: string[];
  onClose: () => void;
}

export function ImagePreview({
  images,
  title = '图片预览',
  compareImages,
  initialIndex = 0,
  onClose,
}: ImagePreviewProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const total = images.length;
  const currentCompare = compareImages?.[activeIndex];

  useEffect(() => {
    if (mainSwiper && !mainSwiper.destroyed && initialIndex > 0) {
      mainSwiper.slideTo(initialIndex, 0);
      setActiveIndex(initialIndex);
    }
  }, [mainSwiper, initialIndex]);

  if (total === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm p-lg"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-xl py-lg border-b shrink-0">
          <h3 className="text-title font-medium">
            {title} ({activeIndex + 1}/{total})
          </h3>
          <div className="flex gap-md">
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 3))}>
              放大
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 0.5))}>
              缩小
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 p-lg gap-md">
          {total > 1 && (
            <Swiper
              onSwiper={setThumbsSwiper}
              direction="vertical"
              spaceBetween={8}
              slidesPerView="auto"
              freeMode
              watchSlidesProgress
              modules={[FreeMode, Thumbs]}
              className="image-preview-thumbs w-20 shrink-0 h-[min(60vh,520px)]"
            >
              {images.map((url, index) => (
                <SwiperSlide
                  key={`${url}-${index}`}
                  className="!h-16 !w-16 cursor-pointer [&.swiper-slide-thumb-active_img]:border-primary [&.swiper-slide-thumb-active_img]:opacity-100"
                >
                  <img
                    src={url}
                    alt={`缩略图 ${index + 1}`}
                    className="w-full h-full object-cover rounded-md border-2 border-gray-200 opacity-70 transition-all"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-md min-h-0">
            <Swiper
              onSwiper={setMainSwiper}
              initialSlide={initialIndex}
              modules={[Thumbs]}
              thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
              onSlideChange={(swiper) => {
                setActiveIndex(swiper.activeIndex);
                setZoomLevel(1);
              }}
              className="flex-1 w-full rounded-lg bg-canvas-parchment"
            >
              {images.map((url, index) => (
                <SwiperSlide key={`${url}-${index}`}>
                  <div className="flex items-center justify-center h-[min(60vh,520px)] overflow-auto p-md">
                    <div
                      style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s' }}
                      className="origin-center"
                    >
                      <img
                        src={url}
                        alt={`预览 ${index + 1}`}
                        className="max-w-full max-h-[min(56vh,480px)] rounded-lg object-contain"
                      />
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {currentCompare && (
              <div className="shrink-0 border-t pt-md">
                <p className="text-caption text-ink-muted-48 mb-xs">原图对比</p>
                <div className="flex items-center gap-md">
                  <img
                    src={currentCompare}
                    alt={`原图 ${activeIndex + 1}`}
                    className="w-16 h-16 object-cover rounded-md border border-gray-200"
                  />
                  <span className="text-caption text-ink-muted-48">← 当前选中图的原图</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageCompare({ processedImages, inputImages, onClose }: ImageCompareProps) {
  return (
    <ImagePreview
      images={processedImages}
      title="改图结果"
      compareImages={inputImages}
      onClose={onClose}
    />
  );
}
