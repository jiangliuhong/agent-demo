import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getConversationMessages } from "@/lib/db";

export async function POST(req: Request) {
  const { conversationId, userMessage, model } = (await req.json()) as {
    conversationId: string;
    userMessage: string;
    model?: string;
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your-openai-api-key-here") {
    return Response.json(
      { error: "请先在 .env.local 中配置 OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  const openai = createOpenAI({ apiKey, baseURL });

  // Validate model is in the allowed list
  const allowedModels = (process.env.OPENAI_MODELS || "gpt-4o-mini")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const selectedModel =
    model && allowedModels.includes(model) ? model : allowedModels[0];

  // Build context from DB messages + new user message
  const dbMessages = getConversationMessages(conversationId);
  const contextMessages = [
    ...dbMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const result = streamText({
    model: openai.chat(selectedModel),
    system:
      "你是一个友好的 AI 助手。请用中文回答用户的问题，回答要准确、有帮助。",
    messages: contextMessages,
  });

  return result.toTextStreamResponse();
}
