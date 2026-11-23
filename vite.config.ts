/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { host: true },
  test: { environment: 'jsdom', globals: true },
});
