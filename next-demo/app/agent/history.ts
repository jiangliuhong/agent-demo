import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { getConversationMessages, type MessageRow } from "@/lib/db";

/**
 * 从数据库加载对话历史，转换为 LangChain BaseMessage 数组。
 * 仅包含 user / assistant 消息（tool 消息属于中间细节，不作为主要对话轮次）。
 */
export function buildHistory(conversationId: string): BaseMessage[] {
  const dbMessages = getConversationMessages(conversationId);

  return dbMessages
    .filter((m: MessageRow) => m.role === "user" || m.role === "assistant")
    .map((m: MessageRow): BaseMessage =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    );
}
