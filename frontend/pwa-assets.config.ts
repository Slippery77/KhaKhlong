import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// สร้างไอคอน PWA ทุกขนาดจาก public/pwa-icon.svg
// รันใหม่เมื่อเปลี่ยนโลโก้: npm run generate-pwa-assets (ในโฟลเดอร์ frontend)
// ไฟล์ที่ได้อยู่ใน public/ และต้อง commit เข้า git
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // พื้นหลังสีครีมของแบรนด์ (#FAF7F2) แทนพื้นขาว
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#FAF7F2' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#FAF7F2' } },
  },
  images: ['public/pwa-icon.svg'],
});
