import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.e2e.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@openio/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname,
      '@openio/ai': new URL('./packages/ai/src/index.ts', import.meta.url).pathname,
      '@openio/tools': new URL('./packages/tools/src/index.ts', import.meta.url).pathname,
      '@openio/memory': new URL('./packages/memory/src/index.ts', import.meta.url).pathname,
      '@openio/agents': new URL('./packages/agents/src/index.ts', import.meta.url).pathname,
      '@openio/mcp': new URL('./packages/mcp/src/index.ts', import.meta.url).pathname,
      '@openio/project-engine': new URL('./packages/project-engine/src/index.ts', import.meta.url).pathname,
    },
  },
});
