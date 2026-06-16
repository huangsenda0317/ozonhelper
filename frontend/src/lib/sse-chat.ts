/** AI 问答 SSE 流解析 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

/** DeepSeek 对话模型 */
export const CHAT_MODELS = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
] as const;

export const DEFAULT_CHAT_MODEL = "deepseek-v4-flash";

export type ChatModelId = (typeof CHAT_MODELS)[number]["value"];

export type ChatSSEEvent =
  | { type: "delta"; content: string }
  | { type: "think_delta"; content: string }
  | { type: "think_done" }
  | {
      type: "tool_start";
      name: string;
      label: string;
      args: Record<string, unknown>;
      cached?: boolean;
    }
  | {
      type: "tool_end";
      name: string;
      label: string;
      result_preview: string;
      status: "success" | "error";
      cached?: boolean;
    }
  | { type: "done" }
  | { type: "error"; message: string; code?: string };

export interface StreamChatOptions {
  storeId: string;
  model: ChatModelId;
  messages: { role: "user" | "assistant"; content: string }[];
  onEvent: (event: ChatSSEEvent) => void;
  signal?: AbortSignal;
}

function parseSSEBlock(block: string): ChatSSEEvent | null {
  let eventType = "message";
  let dataLine = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLine = line.slice(5).trim();
    }
  }
  if (!dataLine) return null;
  try {
    const data = JSON.parse(dataLine) as Record<string, unknown>;
    if (eventType === "delta") {
      return { type: "delta", content: String(data.content ?? "") };
    }
    if (eventType === "think_delta") {
      return { type: "think_delta", content: String(data.content ?? "") };
    }
    if (eventType === "think_done") {
      return { type: "think_done" };
    }
    if (eventType === "tool_start") {
      return {
        type: "tool_start",
        name: String(data.name ?? ""),
        label: String(data.label ?? data.name ?? ""),
        args: (data.args as Record<string, unknown>) ?? {},
        cached: data.cached === true,
      };
    }
    if (eventType === "tool_end") {
      return {
        type: "tool_end",
        name: String(data.name ?? ""),
        label: String(data.label ?? data.name ?? ""),
        result_preview: String(data.result_preview ?? ""),
        status: data.status === "error" ? "error" : "success",
        cached: data.cached === true,
      };
    }
    if (eventType === "done") {
      return { type: "done" };
    }
    if (eventType === "error") {
      return {
        type: "error",
        message: String(data.message ?? "未知错误"),
        code: data.code ? String(data.code) : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function streamChat({
  storeId,
  model,
  messages,
  onEvent,
  signal,
}: StreamChatOptions): Promise<void> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ store_id: storeId, model, messages }),
    signal,
  });

  if (!response.ok) {
    let message = "请求失败";
    try {
      const json = await response.json();
      message = json?.error?.message ?? message;
    } catch {
      /* ignore */
    }
    onEvent({ type: "error", message });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onEvent({ type: "error", message: "无法读取响应流" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const event = parseSSEBlock(part);
      if (event) onEvent(event);
    }
  }

  if (buffer.trim()) {
    const event = parseSSEBlock(buffer);
    if (event) onEvent(event);
  }
}
