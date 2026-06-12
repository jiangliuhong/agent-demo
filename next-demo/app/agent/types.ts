/**
 * 单次 Agent 调用过程中记录的步骤。
 * 每个步骤代表 Agent 循环中的一个离散事件。
 */
export interface AgentStep {
  type: "assistant" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolCallId?: string;
}

/**
 * 以 NDJSON 行流式传输给客户端的事件类型。
 * - assistant:   LLM 输出的中间文本（工具调用之前）
 * - tool_call:   LLM 请求调用某个工具
 * - tool_result: 工具执行完毕，返回结果
 * - final:       Agent 循环结束，包含最终回答和全部步骤
 * - error:       不可恢复的错误
 */
export type AgentStreamEvent =
  | { type: "assistant"; content: string }
  | { type: "tool_call"; content: string; toolName: string; toolCallId?: string }
  | { type: "tool_result"; content: string; toolName: string; toolCallId?: string }
  | { type: "final"; content: string; steps: AgentStep[] }
  | { type: "error"; content: string };

/**
 * 执行器在每个事件发生时调用的回调函数。
 * 流式层用它将事件写入 NDJSON 行。
 */
export type AgentEventCallback = (event: AgentStreamEvent) => void;
