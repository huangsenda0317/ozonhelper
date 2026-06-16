"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, MessageCircle, Store, Wrench } from "lucide-react";
import { Bubble, Sender, XProvider } from "@ant-design/x";
import { XMarkdown } from "@ant-design/x-markdown";
import { theme } from "antd";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/lib/theme-context";
import { streamChat, type ChatModelId } from "@/lib/sse-chat";

import "@ant-design/x-markdown/themes/light.css";
import "@ant-design/x-markdown/themes/dark.css";

export const QUICK_PROMPTS = [
  {
    key: "seller",
    label: "查询卖家账户信息",
    description: "店铺名称、状态、评分等",
  },
  {
    key: "unfulfilled",
    label: "今日待发货订单有多少？",
    description: "未处理 FBS 订单概况",
  },
  {
    key: "orders",
    label: "最近 7 天 FBS 订单概况",
    description: "订单数量与状态分布",
  },
  {
    key: "stocks",
    label: "库存为 0 的商品有哪些？",
    description: "查询零库存 SKU",
  },
];

type ThinkStepStatus = "loading" | "done" | "error";
type ThinkingStatus = "idle" | "loading" | "done" | "error";

interface ToolStep {
  id: string;
  title: string;
  content: string;
  status: ThinkStepStatus;
  cached?: boolean;
}

interface ChatItem {
  key: string;
  role: "user" | "ai";
  content: string;
  streaming?: boolean;
  thinkingContent: string;
  thinkingStatus: ThinkingStatus;
  toolSteps: ToolStep[];
}

export interface AIQAChatProps {
  storeId: string | null;
  model: ChatModelId;
  storesLoading: boolean;
  hasStores: boolean;
}

let messageKey = 0;
let thinkKey = 0;

function nextMessageKey() {
  messageKey += 1;
  return `msg-${messageKey}`;
}

function nextThinkKey() {
  thinkKey += 1;
  return `think-${thinkKey}`;
}

function finalizeToolSteps(steps: ToolStep[]): ToolStep[] {
  return steps.map((step) =>
    step.status === "loading" ? { ...step, status: "done" as const } : step,
  );
}

function markThinkingDone(item: ChatItem): ThinkingStatus {
  return item.thinkingStatus === "loading" ? "done" : item.thinkingStatus;
}

function formatToolArgs(args: Record<string, unknown>): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return "无参数";
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function QuickPromptCards({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="mt-lg">
      <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-sm text-left">
        快捷提问
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt.label)}
            className="text-left p-md rounded-lg border border-hairline bg-surface-card hover:bg-surface-elevated/60 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40"
          >
            <p className="text-caption text-ink font-medium">{prompt.label}</p>
            <p className="text-micro-cap text-muted mt-xxs">{prompt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatWelcome({
  hasStores,
  storesLoading,
  canSend,
  onQuickPrompt,
}: {
  hasStores: boolean;
  storesLoading: boolean;
  canSend: boolean;
  onQuickPrompt: (label: string) => void;
}) {
  if (!hasStores && !storesLoading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center py-xxl">
        <div className="mb-lg p-lg rounded-xxl bg-surface-elevated">
          <Store
            className="h-10 w-10 text-accent-violet-mid"
            aria-hidden="true"
          />
        </div>
        <h2 className="text-heading-sm font-display text-ink mb-xs">
          尚未绑定店铺
        </h2>
        <p className="text-caption text-body max-w-md mb-lg">
          绑定 Ozon 店铺后，即可用自然语言查询订单、库存与卖家信息
        </p>
        <Link href="/settings/stores" className="cursor-pointer">
          <Button variant="primary">前往绑定店铺</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-lg">
        <div className="inline-flex mb-lg p-lg rounded-xxl bg-surface-elevated">
          <MessageCircle
            className="h-10 w-10 text-accent-violet-mid"
            aria-hidden="true"
          />
        </div>
        <h2 className="text-heading-sm font-display text-ink mb-xs">
          AI 店铺问答
        </h2>
        <p className="text-caption text-body max-w-lg mx-auto">
          选择店铺后，用自然语言查询 Ozon 订单、库存、商品与卖家信息。数据来自实时
          API，由 DeepSeek 驱动。
        </p>
      </div>
      {hasStores && (
        <QuickPromptCards
          disabled={!canSend}
          onSelect={onQuickPrompt}
        />
      )}
    </div>
  );
}

function ToolStepRow({ step }: { step: ToolStep }) {
  const isLoading = step.status === "loading";
  const isError = step.status === "error";
  const hasDetail = Boolean(step.content) && !isLoading;
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="py-xxs min-h-[1.5rem]">
      <button
        type="button"
        aria-expanded={hasDetail ? expanded : false}
        aria-label={hasDetail ? `${expanded ? "收起" : "展开"}${step.title}` : step.title}
        disabled={!hasDetail}
        onClick={() => {
          if (hasDetail) setExpanded((prev) => !prev);
        }}
        className={`w-full flex items-center gap-xs text-left rounded-xs transition-colors duration-200 ${
          hasDetail
            ? "cursor-pointer hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40"
            : "cursor-default"
        }`}
      >
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-muted transition-transform duration-200 ${
            !hasDetail ? "opacity-0" : expanded ? "rotate-0" : "-rotate-90"
          }`}
          aria-hidden="true"
        />
        <Wrench
          className={`h-3 w-3 shrink-0 ${
            isError
              ? "text-accent-pink"
              : isLoading
                ? "text-accent-violet-mid"
                : "text-muted"
          }`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 text-caption text-ink leading-snug truncate">
          {step.title}
          {isLoading ? "…" : isError ? "（失败）" : ""}
        </span>
        {isLoading && (
          <Loader2
            className="h-3 w-3 shrink-0 animate-spin text-accent-violet-mid"
            aria-hidden="true"
          />
        )}
      </button>
      {hasDetail && expanded && (
        <pre
          className={`text-micro-cap whitespace-pre-wrap break-words m-0 mt-xxs pl-[1.375rem] font-text leading-relaxed ${
            step.cached ? "text-muted/80 italic" : "text-muted"
          }`}
        >
          {step.content}
        </pre>
      )}
    </li>
  );
}

function AssistantThinkPanel({
  thinkingContent,
  thinkingStatus,
  toolSteps,
  streaming,
  content,
  reduceMotion,
}: {
  thinkingContent: string;
  thinkingStatus: ThinkingStatus;
  toolSteps: ToolStep[];
  streaming?: boolean;
  content: string;
  reduceMotion: boolean;
}) {
  const thinkingLoading = thinkingStatus === "loading";
  const thinkingError = thinkingStatus === "error";
  const hasLoadingTool = toolSteps.some((s) => s.status === "loading");
  const isProcessActive = thinkingLoading || hasLoadingTool;
  const showProcess =
    thinkingStatus !== "idle" || toolSteps.length > 0;
  const showPending =
    streaming && !showProcess && !content;

  const [collapsed, setCollapsed] = useState(true);
  const userToggledRef = useRef(false);
  const processBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streaming && showProcess) {
      if (!userToggledRef.current) {
        setCollapsed(false);
      }
      return;
    }
    if (!streaming && showProcess) {
      setCollapsed(true);
      userToggledRef.current = false;
    }
  }, [streaming, showProcess]);

  // 流式输出时仅在用户已贴底时自动滚到底部，避免抢走手动滚动
  useEffect(() => {
    const el = processBodyRef.current;
    if (collapsed || !isProcessActive || !el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 48) {
      el.scrollTop = el.scrollHeight;
    }
  }, [thinkingContent, toolSteps.length, collapsed, isProcessActive]);

  const processTitle = isProcessActive
    ? hasLoadingTool
      ? "工具调用中"
      : thinkingLoading
        ? "思考中"
        : "处理中"
    : thinkingError
      ? "处理过程（异常）"
      : "处理过程";

  return (
    <div className="flex flex-col gap-md min-w-0 max-w-full">
      {showPending && (
        <p className="text-caption text-muted inline-flex items-center gap-xs py-xs min-h-[1.75rem]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          正在准备回答…
        </p>
      )}

      {showProcess && (
        <div className="ai-qa-process min-w-0 max-w-full">
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => {
              userToggledRef.current = true;
              setCollapsed((prev) => !prev);
            }}
            className="inline-flex items-center gap-xs text-caption text-muted hover:text-ink transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 rounded-xs"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                collapsed ? "-rotate-90" : "rotate-0"
              }`}
              aria-hidden="true"
            />
            <span>{processTitle}</span>
            {isProcessActive && (
              <Loader2
                className="h-3 w-3 animate-spin text-accent-violet-mid"
                aria-hidden="true"
              />
            )}
          </button>

          {!collapsed && (
            <div
              ref={processBodyRef}
              className="ai-qa-process-body mt-sm space-y-sm pl-[1.125rem]"
            >
              {toolSteps.length > 0 && (
                <ul className="space-y-0 m-0 p-0 list-none">
                  {toolSteps.map((step) => (
                    <ToolStepRow key={step.id} step={step} />
                  ))}
                </ul>
              )}

              {(thinkingContent || thinkingLoading) && (
                <div
                  className={
                    toolSteps.length > 0 ? "pt-xs" : undefined
                  }
                >
                  {thinkingContent ? (
                    <pre className="text-caption whitespace-pre-wrap break-words m-0 font-text text-muted leading-relaxed">
                      {thinkingContent}
                    </pre>
                  ) : (
                    <p className="text-caption text-muted inline-flex items-center gap-xs m-0 min-h-[1.75rem]">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      推理中…
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {Boolean(content) && (
        <div className="min-w-0 max-w-full break-words">
          <XMarkdown
            content={content}
            streaming={{
              hasNextChunk: Boolean(streaming),
              enableAnimation: !reduceMotion,
            }}
          />
        </div>
      )}
    </div>
  );
}

function buildSentryXTheme(isDark: boolean) {
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: "#150f23",
      colorBgContainer: isDark ? "#1f1633" : "#ffffff",
      colorBgElevated: isDark ? "#150f23" : "#ffffff",
      colorText: isDark ? "#ffffff" : "#1f1633",
      colorTextSecondary: isDark ? "#bdb8c0" : "#4a4458",
      colorBorder: isDark ? "#362d59" : "#e5e7eb",
      colorBorderSecondary: isDark ? "#362d59" : "#cfcfdb",
      borderRadius: 8,
      fontFamily: "Rubik, system-ui, sans-serif",
      controlOutline: "rgba(157, 193, 245, 0.5)",
    },
  };
}

export function AIQAChat({
  storeId,
  model,
  storesLoading,
  hasStores,
}: AIQAChatProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const canSend = Boolean(storeId) && hasStores && !loading && !storesLoading;

  const updateAssistant = useCallback(
    (assistantKey: string, updater: (prev: ChatItem) => ChatItem) => {
      setItems((prev) =>
        prev.map((item) => (item.key === assistantKey ? updater(item) : item)),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !storeId || !canSend) return;

      setError(null);

      const userKey = nextMessageKey();
      const assistantKey = nextMessageKey();
      const userItem: ChatItem = {
        key: userKey,
        role: "user",
        content: trimmed,
        thinkingContent: "",
        thinkingStatus: "idle",
        toolSteps: [],
      };
      const assistantItem: ChatItem = {
        key: assistantKey,
        role: "ai",
        content: "",
        streaming: true,
        thinkingContent: "",
        thinkingStatus: "idle",
        toolSteps: [],
      };

      const historyForApi = [
        ...items
          .filter((m) => m.content.trim())
          .map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          })),
        { role: "user" as const, content: trimmed },
      ];

      setItems((prev) => [...prev, userItem, assistantItem]);
      setLoading(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          storeId,
          model,
          messages: historyForApi,
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "think_delta" && event.content) {
              updateAssistant(assistantKey, (prev) => ({
                ...prev,
                thinkingContent: prev.thinkingContent + event.content,
                thinkingStatus: "loading",
              }));
            }

            if (event.type === "think_done") {
              updateAssistant(assistantKey, (prev) => ({
                ...prev,
                thinkingStatus: markThinkingDone(prev),
              }));
            }

            if (event.type === "tool_start") {
              updateAssistant(assistantKey, (prev) => ({
                ...prev,
                thinkingStatus:
                  prev.thinkingStatus === "idle" ? "done" : markThinkingDone(prev),
                toolSteps: [
                  ...finalizeToolSteps(prev.toolSteps),
                  {
                    id: nextThinkKey(),
                    title: event.label,
                    content: event.cached
                      ? "复用本次对话已有结果，未重复请求"
                      : formatToolArgs(event.args),
                    status: event.cached ? "done" : "loading",
                    cached: event.cached,
                  },
                ],
              }));
            }

            if (event.type === "tool_end") {
              updateAssistant(assistantKey, (prev) => {
                const toolSteps = [...prev.toolSteps];
                for (let i = toolSteps.length - 1; i >= 0; i -= 1) {
                  const step = toolSteps[i];
                  if (step.status === "loading" || (event.cached && step.cached)) {
                    toolSteps[i] = {
                      ...step,
                      title: event.label,
                      content:
                        event.result_preview ||
                        step.content ||
                        (event.cached ? "复用本次对话已有结果，未重复请求" : ""),
                      status: event.status === "error" ? "error" : "done",
                      cached: event.cached ?? step.cached,
                    };
                    break;
                  }
                }
                return { ...prev, toolSteps };
              });
            }

            if (event.type === "delta" && event.content) {
              updateAssistant(assistantKey, (prev) => ({
                ...prev,
                content: prev.content + event.content,
                thinkingStatus: markThinkingDone(prev),
              }));
            }

            if (event.type === "error") {
              setError(event.message);
              updateAssistant(assistantKey, (prev) => ({
                ...prev,
                content: prev.content || `错误：${event.message}`,
                streaming: false,
                thinkingStatus:
                  prev.thinkingStatus === "loading" ? "error" : prev.thinkingStatus,
                toolSteps: prev.toolSteps.map((s) =>
                  s.status === "loading" ? { ...s, status: "error" } : s,
                ),
              }));
            }

            if (event.type === "done") {
              updateAssistant(assistantKey, (prev) => ({
                ...prev,
                streaming: false,
                thinkingStatus: markThinkingDone(prev),
                toolSteps: finalizeToolSteps(prev.toolSteps),
              }));
            }
          },
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const message =
            err instanceof Error ? err.message : "发送失败，请稍后重试";
          setError(message);
          updateAssistant(assistantKey, (prev) => ({
            ...prev,
            content: prev.content || `错误：${message}`,
            streaming: false,
            thinkingStatus:
              prev.thinkingStatus === "loading" ? "error" : prev.thinkingStatus,
            toolSteps: prev.toolSteps.map((s) =>
              s.status === "loading" ? { ...s, status: "error" } : s,
            ),
          }));
        }
      } finally {
        setLoading(false);
        updateAssistant(assistantKey, (prev) => ({
          ...prev,
          streaming: false,
          thinkingStatus: markThinkingDone(prev),
          toolSteps: finalizeToolSteps(prev.toolSteps),
        }));
      }
    },
    [storeId, model, canSend, items, updateAssistant],
  );

  const bubbleItems = useMemo(
    () =>
      items.map((item) => ({
        key: item.key,
        role: item.role === "user" ? "user" : "ai",
        content: item.content,
        extraInfo: {
          streaming: item.streaming,
          thinkingContent: item.thinkingContent,
          thinkingStatus: item.thinkingStatus,
          toolSteps: item.toolSteps,
        },
      })),
    [items],
  );

  const xTheme = useMemo(() => buildSentryXTheme(isDark), [isDark]);
  const markdownThemeClass = isDark ? "x-markdown-dark" : "x-markdown-light";
  const showWelcome = items.length === 0;

  return (
    <XProvider theme={xTheme}>
      <Card
        variant="default"
        padding="none"
        className={`ai-qa-chat flex flex-col min-h-[480px] md:min-h-[560px] max-h-[calc(100vh-14rem)] overflow-hidden ${markdownThemeClass}`}
      >
        <div className="flex-1 overflow-y-auto px-lg py-lg min-h-0">
          {showWelcome && (
            <ChatWelcome
              hasStores={hasStores}
              storesLoading={storesLoading}
              canSend={canSend}
              onQuickPrompt={(label) => {
                void sendMessage(label);
              }}
            />
          )}

          {bubbleItems.length > 0 && (
            <Bubble.List
              autoScroll
              items={bubbleItems}
              role={{
                ai: {
                  placement: "start",
                  classNames: {
                    content:
                      "!bg-transparent !border-0 !shadow-none !p-0 max-w-full min-w-0",
                  },
                  contentRender: (content, info) => {
                    const text =
                      typeof content === "string"
                        ? content
                        : String(content ?? "");
                    const extra = info.extraInfo as {
                      streaming?: boolean;
                      thinkingContent?: string;
                      thinkingStatus?: ThinkingStatus;
                      toolSteps?: ToolStep[];
                    };
                    return (
                      <AssistantThinkPanel
                        thinkingContent={extra.thinkingContent ?? ""}
                        thinkingStatus={extra.thinkingStatus ?? "idle"}
                        toolSteps={extra.toolSteps ?? []}
                        streaming={extra.streaming}
                        content={text}
                        reduceMotion={reduceMotion}
                      />
                    );
                  },
                },
                user: {
                  placement: "end",
                  classNames: {
                    content:
                      "bg-surface-elevated dark:bg-surface-night text-ink dark:text-on-primary border border-hairline rounded-lg break-words max-w-[85%]",
                  },
                },
              }}
            />
          )}
        </div>

        <div className="border-t border-hairline px-lg py-md shrink-0">
          {!hasStores && !storesLoading && (
            <p className="text-caption text-muted mb-sm">
              请先{" "}
              <Link
                href="/settings/stores"
                className="text-accent-violet-mid hover:underline cursor-pointer"
              >
                绑定 Ozon 店铺
              </Link>{" "}
              后再提问。
            </p>
          )}
          {error && (
            <p className="text-caption text-accent-pink mb-sm" role="alert">
              {error}
            </p>
          )}
          <Sender
            loading={loading}
            disabled={!canSend}
            placeholder={canSend ? "输入问题，Enter 发送" : "请先选择店铺"}
            onSubmit={(message) => {
              void sendMessage(message);
            }}
          />
        </div>
      </Card>
    </XProvider>
  );
}
