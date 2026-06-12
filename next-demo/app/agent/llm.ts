import { ChatOpenAI } from "@langchain/openai";
import { type Runnable } from "@langchain/core/runnables";
import { type AIMessageChunk } from "@langchain/core/messages";
import { type BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { getAllTools } from "./tools";

/**
 * 根据环境变量中的模型白名单校验请求的模型名，返回合法的模型名称。
 */
export function resolveModel(model?: string): string {
  const allowedModels = (process.env.OPENAI_MODELS || "gpt-4o-mini")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  return model && allowedModels.includes(model) ? model : allowedModels[0];
}

/** ChatOpenAI.bindTools() 的返回类型 */
export type ToolCallingRunnable = Runnable<BaseLanguageModelInput, AIMessageChunk>;

/**
 * 创建一个绑定了所有已注册工具的 ChatOpenAI 实例。
 * 如果 API Key 缺失或仍为占位值则抛出异常。
 */
export function createToolCallingLLM(model: string): ToolCallingRunnable {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your-openai-api-key-here") {
    throw new Error("请先在 .env.local 中配置 OPENAI_API_KEY");
  }

  const baseURL = process.env.OPENAI_BASE_URL || undefined;

  const llm = new ChatOpenAI({
    model,
    temperature: 0.7,
    configuration: {
      apiKey,
      baseURL,
    },
  });

  return llm.bindTools(getAllTools());
}
