/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest configuration.
 *
 * Uses Astro's `getViteConfig` so the tsconfig path aliases (@data, @logic,
 * ...) resolve inside tests. Playwright specs under tests/e2e are excluded here
 * and run separately via `npm run test:e2e`.
 */
export default getViteConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', '.astro/**', '_reference/**'],
    css: true,
  },
});
