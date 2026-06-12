import {
  resolveModel,
  createToolCallingLLM,
  buildHistory,
  runAgentLoop,
  createStreamCallback,
  createAgentResponse,
} from "@/app/agent";

export async function POST(req: Request) {
  const { conversationId, userMessage, model } = (await req.json()) as {
    conversationId: string;
    userMessage: string;
    model?: string;
  };

  // 尽早校验 API Key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your-openai-api-key-here") {
    return Response.json(
      { error: "请先在 .env.local 中配置 OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const selectedModel = resolveModel(model);

  let llmWithTools;
  try {
    llmWithTools = createToolCallingLLM(selectedModel);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "LLM 初始化失败" },
      { status: 500 }
    );
  }

  const history = buildHistory(conversationId);

  const stream = new ReadableStream({
    async start(controller) {
      const onEvent = createStreamCallback((chunk) =>
        controller.enqueue(chunk)
      );

      try {
        await runAgentLoop(llmWithTools, history, userMessage, onEvent);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "发生未知错误";
        onEvent({ type: "error", content: errorMessage });
      } finally {
        controller.close();
      }
    },
  });

  return createAgentResponse(stream);
}
