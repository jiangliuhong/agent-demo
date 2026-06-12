import { HumanMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import { getTool } from "./tools";
import type { AgentStep, AgentEventCallback } from "./types";
import type { ToolCallingRunnable } from "./llm";

/**
 * 从 AIMessage 的 content 字段中提取纯文本。
 * 同时处理字符串和结构化内容块数组两种格式。
 */
function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (c): c is { type: string; text: string } =>
          typeof c === "object" && "type" in c && c.type === "text"
      )
      .map((c) => c.text)
      .join("");
  }
  return String(content);
}

/**
 * 执行单个工具调用，返回字符串形式的结果。
 * 通过注册中心按名称查找工具，找不到时返回提示信息。
 */
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = getTool(name);
  if (!tool) return `未知工具: ${name}`;

  const result = await (tool as { invoke: (a: Record<string, unknown>) => Promise<unknown> })
    .invoke(args);
  return typeof result === "string" ? result : JSON.stringify(result);
}

/**
 * 运行完整的 Agent 循环：调用 LLM → 处理工具调用 → 重复直到结束。
 *
 * 调用方需提供：
 * - `llmWithTools`: 已绑定工具的 LLM 实例
 * - `history`:      已有的对话消息
 * - `userMessage`:  新的用户消息文本
 * - `onEvent`:      每个流式事件的回调
 *
 * 返回累积的 Agent 步骤和最终回答内容。
 */
export async function runAgentLoop(
  llmWithTools: ToolCallingRunnable,
  history: BaseMessage[],
  userMessage: string,
  onEvent: AgentEventCallback
): Promise<{ steps: AgentStep[]; finalContent: string }> {
  const steps: AgentStep[] = [];
  const messages: BaseMessage[] = [
    ...history,
    new HumanMessage(userMessage),
  ];

  let continueLoop = true;

  while (continueLoop) {
    const response = await llmWithTools.invoke(messages);

    if (response.tool_calls && response.tool_calls.length > 0) {
      // --- LLM 请求调用工具 ---

      // 提取 LLM 在工具调用之外可能输出的中间文本
      const aiText = extractText(response.content);
      if (aiText) {
        const step: AgentStep = { type: "assistant", content: aiText };
        steps.push(step);
        onEvent({ type: "assistant", content: aiText });
      }

      // 将包含 tool_calls 的 AIMessage 加入对话上下文
      messages.push(response);

      // 逐个执行工具调用
      for (const toolCall of response.tool_calls) {
        // 发送 tool_call 事件
        const callStep: AgentStep = {
          type: "tool_call",
          content: `调用工具: ${toolCall.name}`,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
        };
        steps.push(callStep);
        onEvent({
          type: "tool_call",
          content: `调用工具: ${toolCall.name}`,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
        });

        // 执行工具
        const toolResult = await executeTool(
          toolCall.name,
          toolCall.args as Record<string, unknown>
        );

        // 发送 tool_result 事件
        const resultStep: AgentStep = {
          type: "tool_result",
          content: toolResult,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
        };
        steps.push(resultStep);
        onEvent({
          type: "tool_result",
          content: toolResult,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
        });

        // 将 ToolMessage 加入上下文，供下一轮 LLM 调用使用
        messages.push(
          new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id ?? toolCall.name,
            name: toolCall.name,
          })
        );
      }
    } else {
      // --- 最终回答（无工具调用）---
      const finalContent = extractText(response.content);

      const step: AgentStep = { type: "assistant", content: finalContent };
      steps.push(step);
      onEvent({
        type: "final",
        content: finalContent,
        steps: [...steps],
      });

      continueLoop = false;
      return { steps, finalContent };
    }
  }

  // 正常不会到达此处，仅用于满足类型检查
  return { steps, finalContent: "" };
}
