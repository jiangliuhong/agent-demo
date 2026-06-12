import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 网络搜索模拟工具。
 *
 * 当前返回模拟结果，实际部署时可接入 Tavily、Bing 或 Google 搜索 API。
 */
export const webSearchTool = tool(
  async ({ query }: { query: string }) => {
    return `[模拟搜索结果] 关于 "${query}" 的搜索：这是一个模拟的搜索结果。在实际部署中，可以接入真实的搜索 API（如 Google、Bing 或 Tavily）。`;
  },
  {
    name: "web_search",
    description: "在互联网上搜索信息（当前为模拟版本）",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  }
);
