import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // PatternDB imports ../../assets/patterns.json relative to src/kb/
      // Ensure Vitest can resolve it
    },
  },
});
