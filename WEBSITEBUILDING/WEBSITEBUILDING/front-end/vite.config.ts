import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Tự động cập nhật Service Worker khi có phiên bản mới
      registerType: 'autoUpdate',
      // Bật các tính năng PWA để debug trong môi trường dev
      devOptions: {
        enabled: true,
      },
      // Cấu hình Workbox để quản lý cache
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,woff2,ttf}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Cấu hình HTTPS cho server dev
    https: {
      key: fs.readFileSync('./localhost+1-key.pem'),
      cert: fs.readFileSync('./localhost+1.pem'),
    },
  },
});