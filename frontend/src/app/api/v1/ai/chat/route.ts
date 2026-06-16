/**
 * SSE 流式代理 — 绕过 next.config rewrites 对 event-stream 的缓冲。
 * App Router Route Handler 优先级高于 rewrites。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";

const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function POST(request: Request) {
  const body = await request.text();
  const authorization = request.headers.get("authorization");

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${API_PROXY_TARGET}/api/v1/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "NETWORK_ERROR", message: "无法连接后端服务" },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!backendResponse.ok) {
    const text = await backendResponse.text();
    return new Response(text, {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("Content-Type") || "application/json",
      },
    });
  }

  if (!backendResponse.body) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "STREAM_ERROR", message: "后端未返回流式响应" },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: SSE_HEADERS,
  });
}
