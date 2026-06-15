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
    <div className="relative w-full h-full min-h-[280px] rounded-xl border border-hairline bg-canvas focus-within:ring-2 focus-within:ring-ring-focus focus-within:border-transparent transition-colors duration-200">
      <span className="absolute top-md left-md z-10 text-caption font-medium text-muted pointer-events-none select-none">
        编辑提示词
      </span>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        maxLength={800}
        placeholder="描述你想要对图片做什么修改..."
        className="absolute inset-0 w-full h-full resize-none rounded-lg bg-transparent text-body text-ink placeholder:text-muted focus:outline-none px-xl pt-12 pb-10"
      />
      <span className="absolute bottom-md right-md z-10 text-caption text-muted pointer-events-none select-none">
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
                  className={`px-md py-xs text-caption rounded-md transition-colors duration-200 text-left cursor-pointer ${
                    prompt === p
                      ? "bg-primary text-on-primary"
                      : "bg-canvas text-muted border border-hairline hover:border-hairline-cool"
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
                <label className="block text-caption font-medium text-body mb-xs">
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
                <span className="text-caption text-muted">
                  -1 = 随机
                </span>
              </div>
              <div>
                <label className="block text-caption font-medium text-body mb-xs">
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
                <span className="text-caption text-muted">
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
