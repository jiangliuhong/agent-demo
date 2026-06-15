import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 网络搜索工具。
 *
 * 通过抓取 DuckDuckGo 的 HTML 端点获取真实搜索结果，
 * 无需任何 API Key，开箱即用。
 *
 * 结果包含每条记录的标题、来源链接和摘要，并截取前若干条返回。
 * 注意：HTML 解析方式依赖 DuckDuckGo 的页面结构，若其改版需同步更新解析逻辑。
 */

/** 单条搜索结果 */
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * 将 HTML 中的常见实体还原为普通字符。
 * 覆盖 DuckDuckGo 结果页里最常见的几种转义。
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/**
 * DuckDuckGo 的结果链接是形如
 * `//duckduckgo.com/l/?uddg=<编码后的真实URL>&rut=...`
 * 的跳转地址，这里提取其中的真实目标 URL。
 * 提取失败时回退为原始链接。
 */
function extractRealUrl(href: string): string {
  const match = href.match(/[?&]uddg=([^&]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return href;
    }
  }
  return href;
}

/**
 * 从 DuckDuckGo HTML 响应中解析出搜索结果列表。
 *
 * 结果块的结构大致为：
 *   <a class="result__a" href="//duckduckgo.com/l/?uddg=...">标题</a>
 *   <a class="result__snippet" href="...">摘要</a>
 * 按出现顺序配对标题与摘要。
 */
function parseResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // 匹配标题链接：捕获 href 与锚文本
  const titleRegex =
    /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  // 匹配摘要文本
  const snippetRegex =
    /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const titles: { url: string; title: string }[] = [];
  const snippets: string[] = [];

  let titleMatch: RegExpExecArray | null;
  while ((titleMatch = titleRegex.exec(html)) !== null) {
    const rawUrl = titleMatch[1];
    const rawTitle = titleMatch[2].replace(/<[^>]+>/g, "").trim();
    if (rawTitle) {
      titles.push({
        url: extractRealUrl(rawUrl),
        title: decodeHtmlEntities(rawTitle),
      });
    }
  }

  let snippetMatch: RegExpExecArray | null;
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    const rawSnippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
    if (rawSnippet) {
      snippets.push(decodeHtmlEntities(rawSnippet));
    }
  }

  // 按序配对（标题与摘要通常一一对应出现）
  for (let i = 0; i < titles.length && results.length < maxResults; i++) {
    results.push({
      title: titles[i].title,
      url: titles[i].url,
      snippet: snippets[i] ?? "",
    });
  }

  return results;
}

export const webSearchTool = tool(
  async ({ query, maxResults = 5 }: { query: string; maxResults?: number }) => {
    // 10s 超时，避免网络问题导致 Agent 循环长时间阻塞
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      // 使用 GET 请求：POST 到 html/ 端点会触发 DuckDuckGo 的反爬虫页面（202 状态码），
      // 而 GET 方式可正常返回结果 HTML。
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          // DuckDuckGo 对缺少 UA 的请求可能拒绝，使用常规浏览器 UA
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        signal: controller.signal,
        // 搜索结果需要实时性，跳过 Next.js 的持久缓存
        cache: "no-store",
      });

      if (!response.ok) {
        return `搜索失败：DuckDuckGo 返回状态码 ${response.status}。请稍后重试。`;
      }

      const html = await response.text();
      const results = parseResults(html, maxResults);

      if (results.length === 0) {
        return `未找到与 "${query}" 相关的搜索结果。`;
      }

      const lines = results.map(
        (r, i) =>
          `${i + 1}. ${r.title}\n   ${r.url}${r.snippet ? `\n   ${r.snippet}` : ""}`
      );
      return `搜索 "${query}" 的结果（共 ${results.length} 条）：\n\n${lines.join("\n\n")}`;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return `搜索超时，请稍后重试。`;
      }
      return `搜索出错：${err instanceof Error ? err.message : String(err)}`;
    } finally {
      clearTimeout(timeout);
    }
  },
  {
    name: "web_search",
    description: "在互联网上搜索信息，返回真实的网页搜索结果（标题、链接、摘要）",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("返回结果数量，默认 5，最多 10"),
    }),
  }
);
