import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa'; // <-- Import VitePWA

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ // <-- Thêm cấu hình VitePWA
      registerType: 'autoUpdate', // Tự động cập nhật Service Worker
      outDir: 'dist', // Thư mục đầu ra cho PWA assets
      manifest: { // Cấu hình Manifest (file manifest.json)
        name: 'EventWizard', // Tên ứng dụng
        short_name: 'EventApp', // Tên ngắn gọn
        description: 'Your platform to find and create amazing events', // Mô tả
        theme_color: '#8B5CF6', // Màu chủ đề (event-purple)
        background_color: '#ffffff', // Màu nền
        display: 'standalone', // Chế độ hiển thị (như ứng dụng độc lập)
        scope: '/', // Phạm vi của PWA
        start_url: '/', // URL khởi chạy ứng dụng
        icons: [ // Icons cho ứng dụng (cần tự thêm các file này vào thư mục public)
          {
            src: '/pwa-192x192.png', // Đường dẫn đến icon 192x192
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png', // Đường dẫn đến icon 512x512
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png', // Icon có thể maskable (thích ứng với hình dạng nền)
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: { // Cấu hình Workbox (cho Service Worker)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,woff2,ttf}'], // Cache các loại file này
      },
      devOptions: {
        enabled: true, // Kích hoạt PWA trong môi trường phát triển (để dễ debug)
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { 
    host: true, 
    port: 5173,
  },
});