import type { StructuredToolInterface } from "@langchain/core/tools";

import { weatherTool } from "./weather";
import { calculatorTool } from "./calculator";
import { timeTool } from "./time";
import { webSearchTool } from "./web-search";

/**
 * 工具注册表。
 *
 * 所有 Agent 可用的工具在此集中注册，统一管理。
 * 新增工具时只需定义 <code>xxx.ts</code> 并在 <code>TOOL_REGISTRY</code> 中追加一行即可。
 *
 * 注册后即可通过以下方式访问：
 * - {@link getTool}    按名称查找单个工具
 * - {@link getAllTools} 获取全部工具（用于 bindTools / 工具列表展示）
 */
const TOOL_REGISTRY: StructuredToolInterface[] = [
  weatherTool,
  calculatorTool,
  timeTool,
  webSearchTool,
];

/**
 * 按名称查找工具。
 * 找不到时返回 <code>undefined</code>。
 */
export function getTool(name: string): StructuredToolInterface | undefined {
  return TOOL_REGISTRY.find((t) => t.name === name);
}

/**
 * 获取全部已注册的工具数组。
 * 用于 <code>ChatOpenAI.bindTools()</code> 和工具列表展示。
 */
export function getAllTools(): StructuredToolInterface[] {
  return TOOL_REGISTRY;
}
