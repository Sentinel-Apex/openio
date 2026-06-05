import { z } from 'zod';
import { BaseTool, type ToolContext } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const fetchSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().optional().default(15000),
});

const scrapeSchema = z.object({
  url: z.string().url(),
  timeout: z.number().optional().default(30000),
});

export class WebFetchTool extends BaseTool {
  name = 'web_fetch';
  description = 'Fetch a URL and return its content';
  inputSchema = fetchSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { url, method, headers, body, timeout } = this.validate<z.infer<typeof fetchSchema>>(args);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout ?? ctx?.timeout ?? 15000);

      const res = await fetch(url, {
        method,
        headers: { 'User-Agent': 'OpenIO/1.0', ...headers },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await res.text();
      return {
        success: res.ok,
        output: text,
        metadata: {
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get('content-type'),
          url: res.url,
        },
      };
    } catch (err) {
      return { success: false, error: `Fetch failed: ${(err as Error).message}` };
    }
  }
}

export class WebScrapeTool extends BaseTool {
  name = 'web_scrape';
  description = 'Scrape a web page using headless browser';
  inputSchema = scrapeSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { url, timeout } = this.validate<z.infer<typeof scrapeSchema>>(args);

    try {
      const mod = await Function('return import("playwright")')() as any;
      const browser = await mod.chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      const content = await page.content();
      await browser.close();
      return this.success(content, { url });
    } catch (err) {
      if ((err as Error).message.includes('Cannot find module')) {
        return this.failure('playwright not installed. Run: npx playwright install chromium');
      }
      return this.failure(`Scrape failed: ${(err as Error).message}`);
    }
  }
}
