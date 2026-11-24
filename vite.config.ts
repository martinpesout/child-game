/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
  server: { host: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // manifest also in `npm run dev`, so "Add to Home Screen" works while testing on a phone/tablet
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Křečkova cesta',
        short_name: 'Křeček',
        lang: 'cs',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#bfe7a5',
        theme_color: '#bfe7a5',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,m4a,mp3}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: 'jsdom', globals: true },
});
