import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
