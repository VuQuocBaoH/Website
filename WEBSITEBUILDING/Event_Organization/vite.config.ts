import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa'; 
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate', 
      outDir: 'dist', 
      manifest: { 
        name: 'EventOrganize', 
        short_name: 'EventApp', 
        description: 'Tổ chức và tham gia sự kiện', 
        theme_color: '#8B5CF6', 
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/', 
        start_url: '/', 
        icons: [ 
          {
            src: '/pwa-192x192.png', 
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png', 
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: { 
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,woff2,ttf}'], 
      },
      devOptions: {
        enabled: true, 
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
     https: { // <--- Thêm cấu hình HTTPS này
      key: fs.readFileSync('./localhost+1-key.pem'), 
      cert: fs.readFileSync('./localhost+1.pem'),
     },
  },
});