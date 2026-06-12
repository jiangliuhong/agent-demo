import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 获取指定城市的当前天气（模拟实现）。
 *
 * 模拟数据包含 6 个城市，实际部署时可替换为真实天气 API。
 */
export const weatherTool = tool(
  async ({ city }: { city: string }) => {
    const mockData: Record<string, { temp: string; condition: string }> = {
      北京: { temp: "25°C", condition: "晴" },
      上海: { temp: "28°C", condition: "多云" },
      深圳: { temp: "32°C", condition: "阵雨" },
      广州: { temp: "30°C", condition: "多云" },
      成都: { temp: "22°C", condition: "阴" },
      杭州: { temp: "26°C", condition: "晴" },
    };
    const data = mockData[city];
    if (data) {
      return `${city}当前天气: ${data.condition}, 温度 ${data.temp}`;
    }
    return `${city}: 暂无天气数据（模拟数据仅支持: 北京、上海、深圳、广州、成都、杭州）`;
  },
  {
    name: "get_weather",
    description: "获取指定城市的当前天气信息",
    schema: z.object({
      city: z.string().describe("城市名称，如：北京、上海"),
    }),
  }
);
