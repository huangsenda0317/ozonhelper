"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, Wrench } from "lucide-react";
import { Bubble, Prompts, Sender, Think, Welcome, XProvider } from "@ant-design/x";
import { XMarkdown } from "@ant-design/x-markdown";
import { ConfigProvider, theme } from "antd";

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

function ToolStepThink({ step }: { step: ToolStep }) {
  const isLoading = step.status === "loading";
  const isError = step.status === "error";
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? isLoading;

  React.useEffect(() => {
    if (!isLoading) {
      setUserExpanded(null);
    }
  }, [isLoading]);

  const title = isLoading
    ? `${step.title}…`
    : isError
      ? `${step.title}失败`
      : step.title;

  return (
    <Think
      title={title}
      icon={<Wrench className="h-3.5 w-3.5" aria-hidden />}
      loading={isLoading}
      blink={isLoading}
      expanded={expanded}
      defaultExpanded={false}
      onExpand={setUserExpanded}
    >
      {step.content ? (
        <pre className="text-caption whitespace-pre-wrap break-words m-0 font-text text-muted">
          {step.content}
        </pre>
      ) : isLoading ? (
        <span className="text-caption text-muted inline-flex items-center gap-xs">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          调用中…
        </span>
      ) : null}
    </Think>
  );
}

function AssistantThinkPanel({
  thinkingContent,
  thinkingStatus,
  toolSteps,
  streaming,
  content,
}: {
  thinkingContent: string;
  thinkingStatus: ThinkingStatus;
  toolSteps: ToolStep[];
  streaming?: boolean;
  content: string;
}) {
  const thinkingLoading = thinkingStatus === "loading";
  const thinkingError = thinkingStatus === "error";
  const hasLoadingTool = toolSteps.some((s) => s.status === "loading");
  const isProcessActive = thinkingLoading || hasLoadingTool;
  const showProcess =
    thinkingStatus !== "idle" || toolSteps.length > 0;
  const showPending =
    streaming && !showProcess && !content;

  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? isProcessActive;

  React.useEffect(() => {
    if (!isProcessActive) {
      setUserExpanded(null);
    }
  }, [isProcessActive]);

  const processTitle = isProcessActive
    ? hasLoadingTool
      ? "工具调用中…"
      : thinkingLoading
        ? "深度思考中"
        : "处理中…"
    : thinkingError
      ? "思考过程（异常）"
      : "思考过程";

  return (
    <div className="flex flex-col gap-sm min-w-[240px] max-w-full">
      {showPending && (
        <Think title="正在准备回答…" loading blink defaultExpanded={false} />
      )}

      {showProcess && (
        <Think
          title={processTitle}
          loading={isProcessActive}
          blink={isProcessActive}
          expanded={expanded}
          defaultExpanded={false}
          onExpand={setUserExpanded}
        >
          <div className="flex flex-col gap-xs">
            {toolSteps.map((step) => (
              <ToolStepThink key={step.id} step={step} />
            ))}

            {(thinkingContent || thinkingLoading) && (
              <div
                className={
                  toolSteps.length > 0 ? "pt-sm border-t border-hairline" : ""
                }
              >
                {thinkingContent ? (
                  <pre className="text-caption whitespace-pre-wrap break-words m-0 font-text">
                    {thinkingContent}
                  </pre>
                ) : (
                  <span className="text-caption text-muted inline-flex items-center gap-xs">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    推理中…
                  </span>
                )}
              </div>
            )}
          </div>
        </Think>
      )}

      {Boolean(content) && (
        <XMarkdown
          content={content}
          streaming={{
            hasNextChunk: Boolean(streaming),
            enableAnimation: true,
          }}
        />
      )}
    </div>
  );
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
  const abortRef = useRef<AbortController | null>(null);

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
                    content: formatToolArgs(event.args),
                    status: "loading",
                  },
                ],
              }));
            }

            if (event.type === "tool_end") {
              updateAssistant(assistantKey, (prev) => {
                const toolSteps = [...prev.toolSteps];
                for (let i = toolSteps.length - 1; i >= 0; i -= 1) {
                  const step = toolSteps[i];
                  if (step.status === "loading") {
                    toolSteps[i] = {
                      ...step,
                      title: event.label,
                      content: event.result_preview || step.content,
                      status: event.status === "error" ? "error" : "done",
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

  const antdTheme = useMemo(
    () => ({
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: "#0066cc",
        borderRadius: 8,
      },
    }),
    [isDark],
  );

  const showWelcome = items.length === 0;

  return (
    <XProvider theme={antdTheme}>
      <ConfigProvider theme={antdTheme}>
        <div
          className={`flex flex-col rounded-xl border overflow-hidden ${
            isDark
              ? "border-on-dark-faint bg-surface-elevated/30"
              : "border-hairline bg-white"
          }`}
          style={{ height: "calc(100vh - 12rem)", minHeight: 480 }}
        >
          <div className="flex-1 overflow-y-auto px-md py-lg">
            {showWelcome && (
              <div className="max-w-2xl mx-auto mb-xl">
                <Welcome
                  icon={<MessageCircle className="h-8 w-8 text-accent-violet-mid" />}
                  title="AI 店铺问答"
                  description="选择店铺后，用自然语言查询 Ozon 订单、库存、商品与卖家信息。数据来自实时 API，由 DeepSeek 驱动。"
                />
                {hasStores && (
                  <div className="mt-lg">
                    <Prompts
                      title="快捷提问"
                      wrap
                      items={QUICK_PROMPTS}
                      onItemClick={({ data }) => {
                        if (data.label && canSend) {
                          void sendMessage(String(data.label));
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {bubbleItems.length > 0 && (
              <Bubble.List
                autoScroll
                items={bubbleItems}
                role={{
                  ai: {
                    placement: "start",
                    contentRender: (content, info) => {
                      const text =
                        typeof content === "string" ? content : String(content ?? "");
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
                        />
                      );
                    },
                  },
                  user: {
                    placement: "end",
                  },
                }}
              />
            )}
          </div>

          <div
            className={`border-t px-md py-md ${
              isDark ? "border-on-dark-faint" : "border-hairline"
            }`}
          >
            {!hasStores && !storesLoading && (
              <p className="text-caption text-muted mb-sm">
                请先{" "}
                <Link
                  href="/settings/stores"
                  className="text-accent-violet-mid hover:underline"
                >
                  绑定 Ozon 店铺
                </Link>{" "}
                后再提问。
              </p>
            )}
            {error && (
              <p className="text-caption text-accent-pink mb-sm">{error}</p>
            )}
            <Sender
              loading={loading}
              disabled={!canSend}
              placeholder={
                canSend ? "输入问题，Enter 发送" : "请先选择店铺"
              }
              onSubmit={(message) => {
                void sendMessage(message);
              }}
            />
          </div>
        </div>
      </ConfigProvider>
    </XProvider>
  );
}
