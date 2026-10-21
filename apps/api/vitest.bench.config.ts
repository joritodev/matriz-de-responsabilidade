import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['scripts/**/*.ts'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
