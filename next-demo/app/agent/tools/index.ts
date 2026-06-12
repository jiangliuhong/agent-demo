/**
 * 工具包统一导出。
 *
 * 外部只需 import from "@/app/agent/tools" 即可使用注册中心。
 * 单个工具也可以按需引入：import { weatherTool } from "@/app/agent/tools/weather"。
 */
export { getTool, getAllTools } from "./registry";

// 同时导出各工具定义，方便需要单独引用的场景
export { weatherTool } from "./weather";
export { calculatorTool } from "./calculator";
export { timeTool } from "./time";
export { webSearchTool } from "./web-search";
