import { z } from 'zod';
import { BaseTool } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const searchSchema = z.object({
  query: z.string(),
  count: z.number().optional().default(5),
});

const braveSchema = z.object({
  query: z.string(),
  count: z.number().optional().default(5),
  apiKey: z.string().optional(),
});

const serpSchema = z.object({
  query: z.string(),
  apiKey: z.string().optional(),
});

export class WebSearchTool extends BaseTool {
  name = 'web_search';
  description = 'Search the web using the configured search API';
  inputSchema = searchSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { query } = this.validate<z.infer<typeof searchSchema>>(args);
    return this.failure('No default search provider configured. Use brave_search or serp_search.');
  }
}

export class BraveSearchTool extends BaseTool {
  name = 'brave_search';
  description = 'Search the web using Brave Search API';
  inputSchema = braveSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { query, count, apiKey } = this.validate<z.infer<typeof braveSchema>>(args);
    const key = apiKey ?? process.env.BRAVE_SEARCH_API_KEY;
    if (!key) return this.failure('BRAVE_SEARCH_API_KEY not set');

    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
        { headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': key } },
      );
      if (!res.ok) return this.failure(`Brave API error: ${res.status} ${res.statusText}`);
      const data = (await res.json()) as Record<string, unknown>;
      const web = data.web as Record<string, unknown> | undefined;
      const results = (web?.results ?? []) as Record<string, unknown>[];
      const formatted = results.map((r, i) => `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.description}`).join('\n\n');
      return this.success(formatted, { count: results.length });
    } catch (err) {
      return this.failure(`Brave search failed: ${(err as Error).message}`);
    }
  }
}

export class SerpSearchTool extends BaseTool {
  name = 'serp_search';
  description = 'Search the web using SerpAPI (Google results)';
  inputSchema = serpSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { query, apiKey } = this.validate<z.infer<typeof serpSchema>>(args);
    const key = apiKey ?? process.env.SERPAPI_API_KEY;
    if (!key) return this.failure('SERPAPI_API_KEY not set');

    try {
      const res = await fetch(
        `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${key}`,
      );
      if (!res.ok) return this.failure(`SerpAPI error: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      const results = (data.organic_results ?? []) as Record<string, unknown>[];
      const formatted = results.map((r, i) => `[${i + 1}] ${r.title}\n    ${r.link}\n    ${r.snippet}`).join('\n\n');
      return this.success(formatted, { count: results.length });
    } catch (err) {
      return this.failure(`SerpAPI search failed: ${(err as Error).message}`);
    }
  }
}
