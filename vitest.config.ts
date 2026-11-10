import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.test.ts'],
    alias: {
      '@nexora/domain': path.resolve(__dirname, './packages/domain/src'),
      '@nexora/shared': path.resolve(__dirname, './packages/shared/src'),
      '@nexora/workflow-engine': path.resolve(__dirname, './packages/workflow-engine/src'),
      '@nexora/connectors': path.resolve(__dirname, './packages/connectors/src'),
      '@nexora/agent-runtime': path.resolve(__dirname, './packages/agent-runtime/src')
    }
  }
});
