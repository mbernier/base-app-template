import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Shared options inherited by projects with `extends: true`
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'e2e/**',
        '**/*.config.*',
        'vitest.setup.ts',
        'types/**',
      ],
      thresholds: {
        statements: 85,
        branches: 70,
        functions: 80,
        lines: 85,
      },
    },
    projects: [
      {
        // Unit + component tests: high parallelism, no DB contention
        extends: true,
        test: {
          name: 'unit',
          include: [
            '**/__tests__/unit/**/*.{test,spec}.{ts,tsx}',
            '**/__tests__/component/**/*.{test,spec}.{ts,tsx}',
            'lib/__tests__/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: ['node_modules', '.next', 'e2e'],
          testTimeout: 10000,
          hookTimeout: 15000,
        },
      },
      {
        // Integration tests: sequential to avoid DB connection contention
        extends: true,
        test: {
          name: 'integration',
          include: ['**/__tests__/integration/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', '.next', 'e2e'],
          fileParallelism: false,
          testTimeout: 15000,
          hookTimeout: 20000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
