import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 简易计算器工具。
 *
 * 接收数学表达式字符串，返回计算结果。
 * 出于安全考虑，仅允许数字、运算符、括号和小数点。
 */
export const calculatorTool = tool(
  async ({ expression }: { expression: string }) => {
    try {
      // 仅允许安全的数学字符
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
      if (!sanitized) {
        return "无效的表达式";
      }
      // 使用 Function 构造函数安全求值
      const result = new Function(`return (${sanitized})`)();
      if (typeof result !== "number" || !isFinite(result)) {
        return "计算结果无效";
      }
      return `计算结果: ${expression} = ${result}`;
    } catch {
      return `计算失败，请检查表达式: ${expression}`;
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式，支持加减乘除和括号运算",
    schema: z.object({
      expression: z.string().describe("数学表达式，如: (2 + 3) * 4"),
    }),
  }
);
