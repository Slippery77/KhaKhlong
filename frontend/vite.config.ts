import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' = มีเวอร์ชันใหม่แล้วถามก่อน ไม่ reload เอง
      // (autoUpdate อาจ reload กลางการสั่งอาหาร ทำให้ตะกร้าหาย)
      registerType: 'prompt',
      // ลงทะเบียน service worker เองใน UpdatePrompt.tsx (useRegisterSW)
      injectRegister: false,
      // ตอน dev ไม่มี service worker — กันไฟล์เก่าค้าง cache ระหว่างแก้โค้ด
      // ทดสอบ PWA ต้องใช้ npm run build แล้ว npm run preview
      devOptions: { enabled: false },
      manifest: {
        name: 'ค้าคล่อง POS',
        short_name: 'ค้าคล่อง',
        description: 'ระบบจุดขายสำหรับร้านอาหารขนาดเล็ก',
        lang: 'th',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#FAF7F2',
        background_color: '#FAF7F2',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precache: ไฟล์ที่ build ออกมาทั้งหมด (หน้าเว็บเปิดได้แม้ไม่มีเน็ต)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // ค่าเริ่มต้น 2 MiB แต่ bundle หลักตอนนี้ ~3 MB เพราะ src/data/thailand-address.json (2.9 MB)
        // ถูก import ตรง ๆ — ถ้าไม่แคช แอปจะเปิดตอนออฟไลน์ไม่ได้เลย
        // แก้ถาวร: โหลดไฟล์ที่อยู่แบบ lazy (dynamic import) แล้วลดค่านี้กลับ
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // เปิด URL ใดก็ได้ของแอปตอนออฟไลน์ ให้ตอบด้วย index.html แล้ว React Router จัดการต่อ
        navigateFallback: '/index.html',
        // ห้าม service worker ตอบ /api ด้วย index.html — API ต้องไปถึง server หรือ error จริง
        navigateFallbackDenylist: [/^\/api\//],
        // ข้อมูล API ไม่แคชที่ service worker — จะเก็บใน IndexedDB (Dexie) แยกตามร้าน
        runtimeCaching: [
          {
            // CSS ของฟอนต์ Kanit จาก Google Fonts
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // ไฟล์ฟอนต์ Kanit — ไม่เปลี่ยนตาม URL จึงเก็บนานได้
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  // npm run preview ใช้ proxy เดียวกับตอน dev — ทดสอบ PWA กับ backend จริงได้
  preview: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
