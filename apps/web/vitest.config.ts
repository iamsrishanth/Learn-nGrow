import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@learn-ngrow/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@learn-ngrow/lib': resolve(__dirname, '../../packages/lib/src/index.ts'),
      '@learn-ngrow/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@/': resolve(__dirname, './') + '/',
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
