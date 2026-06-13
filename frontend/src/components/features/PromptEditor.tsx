"use client";

import React from "react";
import { Collapse } from "antd";

export const PRESET_PROMPTS = [
  "去除图片中的所有中文水印和文字，把背景换成白色纯色背景",
  "把背景换成白色纯色背景",
  "去除图片中的水印",
  "把商品的主体颜色改为蓝色",
];

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
}

export function PromptInput({ prompt, onPromptChange }: PromptInputProps) {
  return (
    <div className="relative w-full h-full min-h-[280px] rounded-lg border border-gray-200 bg-canvas focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
      <span className="absolute top-md left-md z-10 text-body-sm font-medium text-ink-muted-48 pointer-events-none select-none">
        编辑提示词
      </span>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        maxLength={800}
        placeholder="描述你想要对图片做什么修改..."
        className="absolute inset-0 w-full h-full resize-none rounded-lg bg-transparent text-body text-ink placeholder:text-ink-muted-48 focus:outline-none px-xl pt-12 pb-10"
      />
      <span className="absolute bottom-md right-md z-10 text-caption text-ink-muted-48 pointer-events-none select-none">
        {prompt.length}/800 字符
      </span>
    </div>
  );
}

interface EditOptionsCollapseProps {
  prompt: string;
  seed: number;
  scale: number;
  onPromptChange: (value: string) => void;
  onSeedChange: (value: number) => void;
  onScaleChange: (value: number) => void;
}

export function EditOptionsCollapse({
  prompt,
  seed,
  scale,
  onPromptChange,
  onSeedChange,
  onScaleChange,
}: EditOptionsCollapseProps) {
  return (
    <Collapse
      defaultActiveKey={[]}
      items={[
        {
          key: "presets",
          label: "推荐提示词",
          children: (
            <div className="flex flex-wrap gap-xs">
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPromptChange(p)}
                  className={`px-md py-xs text-caption rounded-pill transition-all text-left ${
                    prompt === p
                      ? "bg-primary text-white"
                      : "bg-canvas text-ink-muted-48 border border-gray-200 hover:border-primary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          ),
        },
        {
          key: "advanced",
          label: "高级",
          children: (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
              <div>
                <label className="block text-body-sm font-medium text-ink-muted-80 mb-xs">
                  随机种子 (seed): {seed}
                </label>
                <input
                  type="range"
                  min={-1}
                  max={99999}
                  value={seed}
                  onChange={(e) => onSeedChange(parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
                <span className="text-caption text-ink-muted-48">
                  -1 = 随机
                </span>
              </div>
              <div>
                <label className="block text-body-sm font-medium text-ink-muted-80 mb-xs">
                  编辑强度 (scale): {scale}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={scale}
                  onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-caption text-ink-muted-48">
                  越大指令越强，原图影响越小
                </span>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

/** @deprecated 使用 PromptInput + EditOptionsCollapse */
export function PromptEditor(props: EditOptionsCollapseProps) {
  return (
    <div className="space-y-lg">
      <PromptInput
        prompt={props.prompt}
        onPromptChange={props.onPromptChange}
      />
      <EditOptionsCollapse {...props} />
    </div>
  );
}
