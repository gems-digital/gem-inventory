import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA client cho "OmniGem Kho & Giá": cài được ra màn hình chính iOS/Android,
// app-shell cache để mở nhanh. Tokens màu khớp BUILD.md.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'OmniGem Kho & Giá',
        short_name: 'Kho & Giá',
        description: 'Sổ giá & kho nội bộ OmniGem — chỉ dành cho nhân viên.',
        lang: 'vi',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2E7D5B',
        background_color: '#F4F2EC',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Không cache response API (giá nhạy cảm, Cache-Control: no-store).
        navigateFallbackDenylist: [/^\/auth/, /^\/inventory/],
        runtimeCaching: [
          {
            // Ảnh sản phẩm (MinIO / CDN) — cache-first, không phải dữ liệu nhạy cảm.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'omnigem-photos',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
