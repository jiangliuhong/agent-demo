import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 获取当前时间工具。
 *
 * 返回中国时区（Asia/Shanghai）的当前日期和时间。
 */
export const timeTool = tool(
  async () => {
    const now = new Date();
    return `当前时间: ${now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  },
  {
    name: "get_current_time",
    description: "获取当前日期和时间",
    schema: z.object({}),
  }
);
