import type { AgentStreamEvent, AgentEventCallback } from "./types";

const encoder = new TextEncoder();

/**
 * 将单个 Agent 事件编码为一行 NDJSON（带尾部换行符）。
 */
export function encodeEvent(event: AgentStreamEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

/**
 * 创建一个 AgentEventCallback，将 NDJSON 行写入 ReadableStream 控制器。
 * 这是执行器与 HTTP 响应之间的桥梁。
 */
export function createStreamCallback(
  enqueue: (chunk: Uint8Array) => void
): AgentEventCallback {
  return (event: AgentStreamEvent) => {
    enqueue(encodeEvent(event));
  };
}

/**
 * 构造标准的 NDJSON 流式响应。
 */
export function createAgentResponse(body: ReadableStream): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
