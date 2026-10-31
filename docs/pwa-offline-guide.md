# คู่มืออ่านโค้ด PWA + Offline Cache (รอบที่ 1–2)

> เอกสารนี้อธิบายโค้ดที่เพิ่มเข้าไปใน `frontend/` 2 รอบ
> - **รอบ 1 — เปลือก PWA**: ทำให้แอปติดตั้งได้ และเปิดหน้าเว็บได้แม้ไม่มีเน็ต
> - **รอบ 2 — แคชโต๊ะ + กะ**: ทำให้หน้าผังโต๊ะยังแสดงข้อมูลล่าสุดได้ตอนติดต่อ server ไม่ได้
>
> อ่านตามลำดับหัวข้อ — ส่วน "แนวคิด" ก่อน แล้วค่อยลงโค้ด
> โค้ดในเอกสารใส่คอมเมนต์อธิบายทีละบรรทัด (คอมเมนต์ในไฟล์จริงจะสั้นกว่านี้)

---

## สารบัญ

0. [ภาพรวม: ของ 2 ชั้นที่ต้องแยกให้ออก](#0-ภาพรวม-ของ-2-ชั้นที่ต้องแยกให้ออก)
1. [รอบ 1 — เปลือก PWA](#1-รอบ-1--เปลือก-pwa)
   - 1.1 `package.json` · 1.2 `vite.config.ts` · 1.3 `index.html` · 1.4 ไอคอน + `pwa-assets.config.ts` · 1.5 `tsconfig` · 1.6 `UpdatePrompt.tsx` · 1.7 `App.tsx`
2. [รอบ 2 — แคชโต๊ะ + กะ](#2-รอบ-2--แคชโต๊ะ--กะ)
   - 2.1 `db.ts` · 2.2 `snapshotCache.ts` · 2.3 `StaleDataBanner.tsx` · 2.4 `useTables.ts` · 2.5 `useShift.ts` · 2.6 `TablesPage.tsx` · 2.7 `AuthContext.tsx` · 2.8 `main.tsx`
3. [ลำดับเหตุการณ์จริง (เล่าเป็นฉาก)](#3-ลำดับเหตุการณ์จริง)
4. [ทดสอบด้วยตัวเอง](#4-ทดสอบด้วยตัวเอง)
5. [ข้อจำกัดที่รู้อยู่ + งานถัดไป](#5-ข้อจำกัดที่รู้อยู่--งานถัดไป)
6. [คำถามที่กรรมการน่าจะถาม](#6-คำถามที่กรรมการน่าจะถาม)
7. [อภิธานศัพท์](#7-อภิธานศัพท์)

---

## 0. ภาพรวม: ของ 2 ชั้นที่ต้องแยกให้ออก

แอปออฟไลน์มี "ของ" 2 แบบที่ต้องเก็บไว้ในเครื่อง และ **ใช้เครื่องมือคนละตัว**

| | ชั้นที่ 1: ตัวแอป | ชั้นที่ 2: ข้อมูล |
|---|---|---|
| คืออะไร | ไฟล์ HTML / JS / CSS / ไอคอน / ฟอนต์ | ผังโต๊ะ, กะ, เมนู (ต่อไป), ออเดอร์ที่รอส่ง (ต่อไป) |
| เปลี่ยนบ่อยไหม | เปลี่ยนเมื่อ deploy เวอร์ชันใหม่ | เปลี่ยนทุกนาที |
| แยกตามร้านไหม | ไม่ — ทุกร้านใช้ไฟล์ชุดเดียวกัน | **ต้องแยก** — ร้าน A ห้ามเห็นข้อมูลร้าน B |
| เก็บด้วย | **Service Worker** (Workbox) → Cache Storage | **IndexedDB** (Dexie) |
| ทำในรอบ | 1 | 2 |

ถ้าไม่มีชั้นที่ 1 → ปิดเน็ตแล้ว reload จะได้หน้า "ไม่มีการเชื่อมต่ออินเทอร์เน็ต" ของ Chrome — แอปไม่ขึ้นเลย
ถ้าไม่มีชั้นที่ 2 → แอปขึ้น แต่ทุกหน้าว่างเปล่าพร้อม `Failed to fetch`

**ทำไมไม่ให้ Service Worker แคช API ด้วยเลย?** ทำได้ แต่ Service Worker ใช้ URL เป็น key — `GET /api/tables` ของร้าน A กับร้าน B มี URL เดียวกัน (ร้านถูกแยกด้วย token ไม่ใช่ URL) ถ้าร้าน B login เครื่องเดิมจะเห็นโต๊ะร้าน A เก็บใน IndexedDB แล้วใส่ `tenantSlug` เป็น key เองจึงปลอดภัยกว่า และควบคุมได้ในโค้ด React ปกติ

---

## 1. รอบ 1 — เปลือก PWA

### PWA คืออะไร (แบบสั้น)

PWA (Progressive Web App) = เว็บธรรมดาที่มีของเพิ่ม 2 อย่าง

1. **Web App Manifest** — ไฟล์ JSON บอก browser ว่าแอปชื่ออะไร ไอคอนอะไร เปิดแบบไหน → Chrome จึงเสนอปุ่ม "ติดตั้ง"
2. **Service Worker** — สคริปต์ที่ browser รันแยกจากหน้าเว็บ คอยดัก request ทุกตัวที่หน้าเว็บส่งออกไป แล้วเลือกได้ว่าจะตอบจาก cache หรือส่งต่อไป server

```
ไม่มี Service Worker:   หน้าเว็บ ──────────────────► server
มี Service Worker:      หน้าเว็บ ──► Service Worker ──► server
                                       │
                                       └─► Cache Storage (ตอบแทนได้ตอนออฟไลน์)
```

เราไม่ได้เขียน Service Worker เอง — ใช้ `vite-plugin-pwa` ซึ่งเรียก **Workbox** (ไลบรารีของ Google) สร้างไฟล์ `sw.js` ให้ตอน `npm run build`

**ข้อห้ามสำคัญ**: Service Worker ทำงานเฉพาะ **HTTPS หรือ `localhost`** เท่านั้น (เรียกว่า secure context) — โน้ตบุ๊กที่เปิด `localhost` จึงใช้ได้เลย

---

### 1.1 `frontend/package.json`

```jsonc
"scripts": {
  // ... ของเดิม
  "generate-pwa-assets": "pwa-assets-generator"   // ใหม่: สร้างไอคอนทุกขนาดจาก SVG ไฟล์เดียว
},
"devDependencies": {
  // ... ของเดิม
  "@vite-pwa/assets-generator": "^2.0.0",          // ใหม่: เครื่องมือสร้างไอคอน (ใช้ตอนพัฒนาเท่านั้น)
  "vite-plugin-pwa": "^2.0.0"                      // ใหม่: plugin ที่สร้าง manifest + service worker
}
"dependencies": {
  // ... ของเดิม
  "dexie": "4.4.6"                                 // ใหม่ (รอบ 2): ตัวช่วยเขียน IndexedDB — ล็อกเวอร์ชันตายตัว ไม่มี ^
}
```

- `vite-plugin-pwa` เวอร์ชัน 2.0.0 รองรับ Vite 8 (เช็คจาก `peerDependencies` แล้ว)
- `dexie` อยู่ใน `dependencies` (ไม่ใช่ dev) เพราะถูก bundle ไปรันในหน้าเว็บจริง
- **ต้องรัน `npm install` ที่ root `D:\PWA-POS`** เพราะ repo เป็น npm workspaces — ถ้าไม่รันจะเจอ `Failed to resolve import "dexie"`

---

### 1.2 `frontend/vite.config.ts` — หัวใจของรอบ 1

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';                 // plugin ที่เพิ่มเข้ามา

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // มี 2 แบบ:
      //   'autoUpdate' = เจอเวอร์ชันใหม่ → reload หน้าเองทันที
      //   'prompt'     = เจอเวอร์ชันใหม่ → ถามผู้ใช้ก่อน (เราใช้แบบนี้)
      // POS ห้าม reload เอง: พนักงานอาจกำลังกดเมนูอยู่ ตะกร้าจะหาย

      injectRegister: false,
      // ไม่ให้ plugin แทรกโค้ดลงทะเบียน SW เอง — เราลงทะเบียนเองใน UpdatePrompt.tsx
      // เพื่อจะได้รู้สถานะ (พร้อมออฟไลน์ / มีเวอร์ชันใหม่) แล้วแสดงบนหน้าจอ

      devOptions: { enabled: false },
      // npm run dev จะไม่มี Service Worker
      // ถ้าเปิดไว้ SW จะแคชไฟล์เก่า → แก้โค้ดแล้วหน้าไม่เปลี่ยน → งงมาก
      // ทดสอบ PWA ให้ใช้ npm run build แล้ว npm run preview

      manifest: {                                          // ← กลายเป็นไฟล์ dist/manifest.webmanifest
        name: 'ค้าคล่อง POS',                               // ชื่อเต็ม (หน้าติดตั้ง, Start Menu)
        short_name: 'ค้าคล่อง',                             // ชื่อสั้น (ใต้ไอคอน)
        description: 'ระบบจุดขายสำหรับร้านอาหารขนาดเล็ก',
        lang: 'th',
        start_url: '/',
        // หน้าแรกเมื่อกดไอคอนแอป — '/' คือ store finder ซึ่งจะเด้งไป /{ร้าน}/login เองถ้าเคยเข้า
        // เป็น path แบบ relative จึงไม่ผูกกับโดเมน (localhost หรือ deploy ก็ใช้ค่าเดียวกัน)
        scope: '/',                                        // URL ไหนนับเป็น "ในแอป" — ทั้งเว็บ
        display: 'standalone',                             // เปิดเป็นหน้าต่างแยก ไม่มีแถบ URL
        theme_color: '#FAF7F2',                            // สีแถบหัวหน้าต่าง
        background_color: '#FAF7F2',                       // สีพื้นตอนแอปกำลังเปิด (splash)
        icons: [
          { src: 'pwa-64x64.png',   sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },   // ขั้นต่ำที่ Chrome ต้องการ
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },   // ขั้นต่ำที่ Chrome ต้องการ
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          // maskable = ไอคอนที่มีขอบเผื่อ OS ตัดเป็นวงกลม/สี่เหลี่ยมมนได้โดยโลโก้ไม่โดนตัด
        ],
      },

      workbox: {                                           // ← ตั้งค่าให้ Workbox สร้าง dist/sw.js
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // "precache" = ไฟล์ที่ SW ดาวน์โหลดเก็บไว้ทันทีตั้งแต่เปิดแอปครั้งแรก
        // pattern นี้ = ทุกไฟล์ใน dist/ ที่นามสกุลตรง (ตอนนี้ได้ 20 ไฟล์ ~3 MB)

        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // ค่าปกติของ Workbox = 2 MiB ต่อไฟล์ ไฟล์ใหญ่กว่านี้จะไม่ถูกแคช
        // แต่ JS หลักของเราใหญ่ 3 MB (เพราะ thailand-address.json 2.9 MB ถูก import ตรง ๆ)
        // ถ้าไม่ขยาย → JS หลักไม่ถูกแคช → ออฟไลน์แล้วแอปเปิดไม่ขึ้นเลย
        // ทางแก้ถาวร: ให้ StoreSettingPage โหลดไฟล์ที่อยู่แบบ lazy (ดูหัวข้อ 5)

        navigateFallback: '/index.html',
        // ถ้าผู้ใช้เปิด URL ใดก็ได้ เช่น /krua-ban/tables ตอนออฟไลน์
        // SW ไม่มีไฟล์ชื่อนั้น (เป็น route ของ React ไม่ใช่ไฟล์จริง)
        // จึงตอบด้วย index.html แล้ว React Router ไปแสดงหน้า tables เอง

        navigateFallbackDenylist: [/^\/api\//],
        // ยกเว้น URL ที่ขึ้นต้น /api/ — ห้ามตอบด้วย index.html
        // ไม่งั้นตอนออฟไลน์ fetch('/api/tables') จะได้ HTML กลับมาแทน error
        // แล้วโค้ดพยายาม JSON.parse(HTML) → พังแบบงง ๆ

        runtimeCaching: [
          // "runtime cache" = แคชตอนใช้งานจริง (ไม่ได้โหลดล่วงหน้าแบบ precache)
          // ใช้กับไฟล์ที่อยู่นอกเว็บเรา — ฟอนต์ Kanit จาก Google
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            // ไฟล์ CSS ที่บอกว่าฟอนต์อยู่ที่ไหน
            handler: 'StaleWhileRevalidate',
            // ตอบจาก cache ทันที แล้วแอบโหลดใหม่เบื้องหลังเก็บไว้รอบหน้า
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            // ไฟล์ฟอนต์จริง (.woff2) — URL มีเวอร์ชันในตัว ไม่เปลี่ยนเนื้อหา
            handler: 'CacheFirst',
            // มีใน cache ใช้เลย ไม่ถาม server (ประหยัดเน็ต)
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              // status 0 = "opaque response" — response ข้ามโดเมนที่ browser ไม่ให้อ่าน status จริง
              // ต้องยอมรับ 0 ไม่งั้นฟอนต์จะไม่ถูกเก็บ
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },  // เก็บสูงสุด 30 ไฟล์ 1 ปี
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://localhost:3000' },    // ของเดิม: npm run dev ส่ง /api ไป backend
  },
  preview: {
    proxy: { '/api': 'http://localhost:3000' },    // ใหม่: npm run preview ก็ส่ง /api ไป backend ด้วย
    // ไม่มีบรรทัดนี้ → ทดสอบ PWA (ต้องใช้ preview) แล้วเรียก API ไม่ได้เลย
  },
});
```

**Strategy ของ Workbox ที่ควรจำ 3 ตัว**

| ชื่อ | ทำงานยังไง | เหมาะกับ |
|---|---|---|
| `CacheFirst` | ดู cache ก่อน ไม่มีค่อยไป server | ไฟล์ที่ไม่เปลี่ยน (ฟอนต์, รูปที่มี hash ในชื่อ) |
| `NetworkFirst` | ไป server ก่อน ล้มค่อยใช้ cache | ข้อมูลที่ต้องสดแต่อยากมีสำรอง |
| `StaleWhileRevalidate` | ตอบจาก cache ทันที + โหลดใหม่เบื้องหลัง | ไฟล์ที่เปลี่ยนนาน ๆ ครั้ง และยอมเห็นของเก่า 1 รอบได้ |

> รอบ 2 เราทำ "NetworkFirst" เองในโค้ด React (`fetchWithSnapshot`) แทนการให้ SW ทำ — เหตุผลอยู่ในหัวข้อ 0

---

### 1.3 `frontend/index.html`

```html
<html lang="th">
<!-- เดิม lang="en" — ผิดเพราะเนื้อหาเป็นภาษาไทย มีผลกับ screen reader และการตัดคำ -->

  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <!-- ไอคอนแท็บ browser แบบ .ico (รองรับทุก browser) -->

  <link rel="icon" href="/pwa-icon.svg" sizes="any" type="image/svg+xml" />
  <!-- ไอคอนแท็บแบบ SVG (คมทุกขนาด) — browser ใหม่จะเลือกตัวนี้ -->

  <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
  <!-- ไอคอนตอน iPhone/iPad กด "Add to Home Screen" -->

  <meta name="theme-color" content="#FAF7F2" />
  <!-- สีแถบ browser บนมือถือ ให้ตรงกับ manifest -->
```

**บั๊กเดิมที่แก้ไปด้วย**: บรรทัดเก่าคือ

```html
<link rel="icon" type="image/svg+xml" href="..\src\assets\khaklong.svg" />
```

ผิด 2 จุด — (1) ใช้ `\` แทน `/` (2) ชี้ออกไปนอกโฟลเดอร์ `public/` ตอน `npm run dev` ทำงานได้เพราะ Vite เสิร์ฟไฟล์ใน `src/` ให้ แต่หลัง `npm run build` ไม่มีโฟลเดอร์ `src/` ใน `dist/` → favicon หาย

กฎ: ไฟล์ที่อ้างจาก `index.html` ด้วย path ตายตัว ต้องอยู่ใน `public/` และอ้างด้วย `/ชื่อไฟล์`

---

### 1.4 ไอคอน: `public/pwa-icon.svg` + `pwa-assets.config.ts`

**`public/pwa-icon.svg`** — ต้นฉบับไอคอน 1 ไฟล์ ใช้สร้างไอคอนทุกขนาด

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="46 43 190 190" width="512" height="512">
  <!-- viewBox = "x เริ่ม, y เริ่ม, กว้าง, สูง" ของพื้นที่ที่จะเห็น
       ตั้งให้เส้นโลโก้อยู่กลางกรอบ 190×190 และเว้นขอบรอบ ๆ
       (ไฟล์ src/assets/khaklong.svg เดิมตั้งใจครอปชิดขอบสำหรับ favicon 16px
        ถ้าเอามาทำไอคอนแอปตรง ๆ โลโก้จะโดนตัดขอบ — ลองแล้วเจอจริง) -->
  <path d="M 152 72 C 128 58, ... 196 168"           <!-- เส้นโลโก้เดียวกับของเดิมทุกจุด -->
        fill="none" stroke="#8C6D58" stroke-width="23"   <!-- เปลี่ยนสีจากดำเป็น accent ของแบรนด์ -->
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**`frontend/pwa-assets.config.ts`** — ตั้งค่าเครื่องสร้างไอคอน

```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },        // รูปแบบแท็ก <link> ที่แนะนำ (ใช้แค่ตอนพิมพ์ผลลัพธ์)
  preset: {
    ...minimal2023Preset,
    // preset "ชุดขั้นต่ำปี 2023" = สร้าง 6 ไฟล์ที่ browser ปัจจุบันต้องใช้:
    // pwa-64x64, pwa-192x192, pwa-512x512, maskable-icon-512x512,
    // apple-touch-icon-180x180, favicon.ico

    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#FAF7F2' } },
    apple:    { ...minimal2023Preset.apple,    resizeOptions: { background: '#FAF7F2' } },
    // 2 แบบนี้ต้องมีพื้นทึบ (OS ไม่รองรับพื้นโปร่งใส) → ใช้สีครีมของแบรนด์แทนสีขาว
  },
  images: ['public/pwa-icon.svg'],            // ไฟล์ต้นฉบับ
});
```

ใช้งาน: เปลี่ยนโลโก้เมื่อไหร่ แก้ `pwa-icon.svg` แล้วรัน

```powershell
cd frontend; npm run generate-pwa-assets
```

PNG ทั้ง 6 ไฟล์ใน `public/` จะถูกสร้างทับ — **ต้อง commit ไฟล์ PNG เข้า git** (เครื่องอื่นจะได้ไม่ต้องสร้างเอง)

> หมายเหตุ: `public/favicon.ico` ถูกสร้างทับของเดิมด้วยโลโก้ค้าคล่อง

---

### 1.5 `tsconfig.app.json` + `tsconfig.node.json`

```jsonc
// tsconfig.app.json  (ตั้งค่า TypeScript ของโค้ดใน src/)
"types": ["vite/client", "vite-plugin-pwa/react"]
//                        ^^^^^^^^^^^^^^^^^^^^^^ ใหม่
// บอก TypeScript ว่า module 'virtual:pwa-register/react' มี type อะไร
// "virtual module" = module ที่ไม่มีไฟล์จริง plugin สร้างให้ตอน build
// ไม่ใส่บรรทัดนี้ → tsc แดง: Cannot find module 'virtual:pwa-register/react'
```

```jsonc
// tsconfig.node.json  (ตั้งค่า TypeScript ของไฟล์ config ที่รันด้วย Node)
"include": ["vite.config.ts", "pwa-assets.config.ts"]
//                             ^^^^^^^^^^^^^^^^^^^^^ ใหม่ — ให้ tsc ตรวจไฟล์ config ไอคอนด้วย
```

---

### 1.6 `features/offline/components/UpdatePrompt.tsx`

หน้าที่: (1) ลงทะเบียน Service Worker (2) แจ้งเตือนมุมขวาล่าง 2 แบบ

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react';
// hook จาก vite-plugin-pwa — ลงทะเบียน SW และบอกสถานะเป็น React state
import { CloudCheck, RefreshCw, X } from 'lucide-react';      // ไอคอน (ตามกฎห้ามใช้ emoji)

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;               // 1 ชั่วโมง

export default function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    // true เมื่อ SW แคชไฟล์ครบรอบแรก → "พร้อมใช้งานออฟไลน์"
    // รูปแบบ [ค่า, ฟังก์ชันตั้งค่า] เหมือน useState

    needRefresh: [needRefresh, setNeedRefresh],
    // true เมื่อมี SW เวอร์ชันใหม่ดาวน์โหลดเสร็จ แต่ยังรออยู่ (status: waiting)

    updateServiceWorker,
    // เรียกแล้ว SW ใหม่จะเข้าทำงานแทนตัวเก่า และ reload หน้า
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // เรียกครั้งเดียวหลังลงทะเบียนสำเร็จ
      if (!registration) return;
      setInterval(() => {
        // ปกติ browser เช็คเวอร์ชันใหม่เฉพาะตอนเปิดหน้า/เปลี่ยนหน้า
        // แต่ POS เปิดค้างทั้งวันไม่เคย reload → ต้องสั่งเช็คเองทุกชั่วโมง
        if (navigator.onLine) registration.update().catch(() => {});
        // ออฟไลน์อยู่ข้ามไปก่อน · .catch กันไม่ให้ error เด้งใน console
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error('[PWA] ลงทะเบียน service worker ไม่สำเร็จ', error);
      // เช่น เปิดผ่าน http://192.168.x.x (ไม่ใช่ secure context)
    },
  });

  if (!offlineReady && !needRefresh) return null;   // ไม่มีอะไรต้องแจ้ง → ไม่แสดงอะไรเลย

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    // กด "ภายหลัง" → ซ่อนกล่อง แต่ SW ใหม่ยังรออยู่
    // ปิดแท็บ/ปิดแอปทุกหน้าต่างแล้วเปิดใหม่ เวอร์ชันใหม่จะทำงานเอง
  };

  return (
    <div
      role="status" aria-live="polite"
      // aria = บอก screen reader ให้อ่านข้อความนี้เมื่อปรากฏ (กฎ a11y ใน AGENTS.md)
      className="fixed bottom-4 right-4 z-[1000] ..."   // ลอยมุมขวาล่าง อยู่เหนือทุกอย่าง
    >
      {needRefresh ? <RefreshCw ... /> : <CloudCheck ... />}

      <div className="flex-1">
        <p className="font-medium">{needRefresh ? 'มีเวอร์ชันใหม่' : 'พร้อมใช้งานออฟไลน์'}</p>
        <p className="...">
          {needRefresh
            ? 'กดอัปเดตตอนที่ไม่มีออเดอร์ค้างในหน้าจอ หน้าเว็บจะโหลดใหม่'
            : 'เปิดแอปได้แม้อินเทอร์เน็ตหลุด'}
        </p>

        {needRefresh && (
          <div className="mt-3 flex gap-2">
            <button onClick={() => updateServiceWorker(true)} ...>อัปเดตเลย</button>
            {/* true = reload หน้าหลังสลับ SW */}
            <button onClick={close} ...>ภายหลัง</button>
          </div>
        )}
      </div>

      <button onClick={close} aria-label="ปิดการแจ้งเตือน" ...><X ... /></button>
    </div>
  );
}
```

**วงจรชีวิตของ Service Worker** (อ่านแล้วจะเข้าใจว่าทำไมมี `needRefresh`)

```
build ใหม่ → sw.js เปลี่ยน
        │
browser เจอ sw.js ใหม่ (ตอนเปิดหน้า หรือ registration.update())
        │
installing  ── ดาวน์โหลดไฟล์ precache ชุดใหม่
        │
waiting     ── รอ เพราะหน้าเว็บที่เปิดอยู่ยังใช้ไฟล์ชุดเก่า  ← needRefresh = true
        │
(กด "อัปเดตเลย" หรือปิดทุกหน้าต่างของแอป)
        │
activated   ── ลบ cache เก่า ใช้ชุดใหม่
```

> **TODO ที่เขียนไว้ในไฟล์**: ตอนทำ outbox ต้องซ่อนปุ่ม "อัปเดตเลย" ถ้ายังมีออเดอร์รอส่ง — เวอร์ชันใหม่อาจเปลี่ยนรูปแบบข้อมูลในคิว

---

### 1.7 `App.tsx`

```tsx
import UpdatePrompt from './features/offline/components/UpdatePrompt';   // ใหม่

<SalesProvider>
  <KDSProvider>
    <AppRouter />
    <UpdatePrompt />    {/* ใหม่: วางนอก router → แสดงได้ทุกหน้า */}
  </KDSProvider>
</SalesProvider>
```

---

## 2. รอบ 2 — แคชโต๊ะ + กะ

### แนวคิดหลัก 4 ข้อ

**① Snapshot = ภาพถ่ายข้อมูลครั้งล่าสุด**
ทุกครั้งที่โหลดจาก server สำเร็จ → บันทึกสำเนาทับของเดิม 1 แถวต่อร้านต่อชนิดข้อมูล

**② Network First — ถาม server ก่อนเสมอ**

```
ถาม server
  ├─ ได้คำตอบ            → ใช้ข้อมูลสด + บันทึก snapshot ใหม่
  ├─ ติดต่อไม่ได้          → ใช้ snapshot + ขึ้นแถบ "ข้อมูล ณ 00:12 น."
  └─ server ตอบปฏิเสธ     → แสดง error ตามเดิม (ห้ามใช้ snapshot)
```

ทำไมไม่ Cache First: สถานะโต๊ะเปลี่ยนตลอดจากเครื่องอื่น อ่าน cache ก่อน = เห็นโต๊ะว่างทั้งที่ลูกค้านั่งแล้ว

**③ "ติดต่อไม่ได้" ≠ "ถูกปฏิเสธ"** — จุดที่สำคัญที่สุดของรอบนี้

| error | ความหมาย | ใช้ snapshot? |
|---|---|---|
| `TypeError: Failed to fetch` | ไม่มีเน็ต / server ปิด / DNS ล้ม | ✅ |
| HTTP 500, 502, 503, 504 | proxy ต่อ backend ไม่ได้ / backend ล่ม | ✅ |
| HTTP 401 | token หมดอายุ | ❌ ต้อง login ใหม่ |
| HTTP 403 | ไม่มีสิทธิ์ | ❌ |
| HTTP 404, 409, 400 | ข้อมูลผิด | ❌ |

ถ้าใช้ snapshot ตอน 401 → คนที่ session หมดแล้วยังเห็นผังโต๊ะ = ซ่อนปัญหาจริง

**④ key = `[tenantSlug + kind]`**
เครื่องเดียวกันเคยเข้า 2 ร้าน → ข้อมูลไม่ปนกัน
ใช้ `tenantSlug` ไม่ใช้ `tenantID` เพราะใน `AuthUser` มี `tenantID?` (optional อาจไม่มี) แต่ `tenantSlug` มีเสมอและไม่ซ้ำ

---

### IndexedDB กับ Dexie คืออะไร

| | `localStorage` | `sessionStorage` | **IndexedDB** |
|---|---|---|---|
| เก็บอะไร | string เท่านั้น | string เท่านั้น | object / array ตรง ๆ |
| ขนาด | ~5 MB | ~5 MB | หลายร้อย MB (ตามพื้นที่ดิสก์) |
| อ่าน/เขียน | sync — บล็อกหน้าจอ | sync | **async** — ไม่บล็อก |
| อยู่ถึงเมื่อไหร่ | จนกว่าจะลบ | ปิดแท็บ = หาย | จนกว่าจะลบ |
| query / index | ไม่มี | ไม่มี | มี |

IndexedDB เป็นของ browser แต่ API ดิบใช้ยากมาก (ต้องเขียน callback `onsuccess` / `onerror` ซ้อนกันหลายชั้น) — **Dexie** ห่อให้ใช้แบบ `await db.table.get(key)` ได้

---

### 2.1 `features/offline/db.ts` — สร้างฐานข้อมูลในเครื่อง

```ts
import Dexie, { type Table } from 'dexie';

/** ชนิดข้อมูลที่แคช — เพิ่มชนิดใหม่ที่นี่ เช่น 'menu' ในขั้นถัดไป */
export type SnapshotKind = 'tables' | 'currentShift';
// ใช้ union type แทน string ทั่วไป → พิมพ์ผิด เช่น 'tabels' TypeScript จะแดงทันที

/** หน้าตา 1 แถวในตาราง snapshots */
export interface Snapshot<T = unknown> {
  tenantSlug: string;   // ร้านไหน
  kind: SnapshotKind;   // ข้อมูลชนิดอะไร
  data: T;              // ตัวข้อมูล (array ของโต๊ะ / object กะ) — เก็บ object ได้ตรง ๆ ไม่ต้อง JSON.stringify
  savedAt: number;      // Date.now() ตอนบันทึก — ไว้บอกพนักงานว่าข้อมูลเก่าแค่ไหน
}

class PosDatabase extends Dexie {
  snapshots!: Table<Snapshot, [string, SnapshotKind]>;
  // ประกาศว่ามีตารางชื่อ snapshots
  // Table<ชนิดของแถว, ชนิดของ primary key>
  // key เป็น tuple [ร้าน, ชนิด] เพราะใช้ key ผสม 2 ค่า
  // ! = บอก TypeScript ว่า "Dexie จะใส่ค่าให้เอง ไม่ต้องเตือนว่ายังไม่ได้กำหนด"

  constructor() {
    super('pwa-pos');
    // ชื่อฐานข้อมูล — เห็นใน DevTools > Application > IndexedDB > pwa-pos

    this.version(1).stores({
      snapshots: '[tenantSlug+kind], tenantSlug',
      // รูปแบบ: 'primaryKey, index1, index2, ...'
      // '[tenantSlug+kind]' = primary key แบบผสม (compound key)
      //                       ร้านเดียวกัน + ชนิดเดียวกัน มีได้แค่ 1 แถว
      //                       put() ซ้ำ = เขียนทับ ไม่เพิ่มแถว
      // 'tenantSlug'        = index เพิ่ม ใช้ค้นทุกแถวของร้านเดียว (ลบตอน logout)
      // ไม่ต้องประกาศ data / savedAt — Dexie เก็บทุก field อยู่แล้ว ประกาศเฉพาะที่ต้องค้นหา
    });
    // ⚠ กฎเหล็ก: ห้ามแก้ version(1) หลังมีคนใช้งานแล้ว
    //   ถ้าจะเปลี่ยน schema ให้เพิ่ม this.version(2).stores({...}) ต่อท้าย
    //   Dexie จะอัปเกรดฐานข้อมูลในเครื่องผู้ใช้ให้เอง
  }
}

export const db = new PosDatabase();
// สร้างครั้งเดียวทั้งแอป (module ถูก import กี่ที่ก็ได้ instance เดียวกัน)

export function requestPersistentStorage(): void {
  if (!navigator.storage?.persist) return;   // browser เก่าไม่มี API นี้ → ข้าม
  navigator.storage
    .persisted()                                         // ถามว่าได้สิทธิ์ถาวรแล้วหรือยัง
    .then((already) => (already ? true : navigator.storage.persist()))  // ยังไม่ได้ → ขอ
    .catch(() => false);                                 // ขอไม่ได้ก็ไม่เป็นไร
}
// ปกติ browser มีสิทธิ์ลบข้อมูลเว็บเองตอนดิสก์ใกล้เต็ม ("best-effort storage")
// persist() = ขอให้ห้ามลบ ("persistent storage")
// Chrome อนุญาตอัตโนมัติถ้าติดตั้งเป็นแอป หรือใช้เว็บบ่อย — ไม่มี popup ถาม
```

---

### 2.2 `features/offline/snapshotCache.ts` — ตรรกะทั้งหมดของการแคช

```ts
import { ApiError } from '../../libs/appClient';      // error ที่ apiFetch โยนเมื่อ server ตอบ status ไม่ใช่ 2xx
import { db, type SnapshotKind } from './db';

// ---------- ชนิดผลลัพธ์ ----------

export interface FreshResult<T> { data: T; isStale: false; }
// ข้อมูลสดจาก server

export interface StaleResult<T> { data: T; isStale: true; savedAt: number; }
// ข้อมูลจาก snapshot — มี savedAt บอกเวลา

export type CachedResult<T> = FreshResult<T> | StaleResult<T>;
// "discriminated union" — TypeScript ดูค่า isStale แล้วรู้เองว่ามี savedAt หรือไม่
//   if (result.isStale) { result.savedAt }   ← ใช้ได้
//   else                { result.savedAt }   ← TypeScript แดง เพราะ FreshResult ไม่มี

// ---------- แยกชนิด error ----------

export function isUnreachableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  // fetch() จะ "โยน" TypeError เองเมื่อ request ไปไม่ถึง server เลย
  // ข้อความมักเป็น "Failed to fetch" — ไม่มี HTTP status เพราะไม่มี response

  if (error instanceof ApiError) return error.status >= 500;
  // ได้ response แต่ status 5xx:
  //   502/503/504 = proxy (Vite, Vercel) ต่อ backend ไม่ได้, Render กำลังตื่น
  //   500 = Vite proxy ตอบแบบนี้เมื่อ backend ไม่ได้รัน (ทดสอบแล้ว: ECONNREFUSED → 500)
  // ข้อเสียที่ยอมรับ: บั๊กจริงของ backend ที่ตอบ 500 จะเห็นข้อมูลเก่า + แถบเตือน แทน error

  return false;   // อย่างอื่นทั้งหมด (4xx, error ในโค้ดเรา) = ไม่ใช่ปัญหาการเชื่อมต่อ
}

// ---------- อ่าน / เขียน snapshot ----------

export async function saveSnapshot<T>(tenantSlug: string, kind: SnapshotKind, data: T): Promise<void> {
  try {
    await db.snapshots.put({ tenantSlug, kind, data, savedAt: Date.now() });
    // put = "ถ้ามี key นี้แล้วเขียนทับ ไม่มีก็เพิ่มใหม่" (upsert)
    // ต่างจาก add ที่จะ error ถ้า key ซ้ำ
  } catch (error) {
    console.warn('[offline] บันทึก snapshot ไม่สำเร็จ', kind, error);
    // เช่น โหมด Incognito บางแบบ / ดิสก์เต็ม
    // ไม่โยน error ต่อ — หน้าจอต้องแสดงข้อมูลสดได้ตามปกติ แค่ไม่มีสำรองไว้
  }
}

export async function readSnapshot<T>(tenantSlug: string, kind: SnapshotKind)
  : Promise<{ data: T; savedAt: number } | undefined> {
  try {
    const row = await db.snapshots.get([tenantSlug, kind]);   // หาด้วย compound key
    return row ? { data: row.data as T, savedAt: row.savedAt } : undefined;
    // as T = บอก TypeScript ว่าเชื่อเราเถอะ ข้อมูลนี้เป็นชนิด T (เพราะเราเป็นคนเขียนลงไปเอง)
  } catch {
    return undefined;   // อ่านไม่ได้ = เหมือนไม่มี snapshot
  }
}

export async function clearTenantSnapshots(tenantSlug: string): Promise<void> {
  try {
    await db.snapshots.where('tenantSlug').equals(tenantSlug).delete();
    // ใช้ index 'tenantSlug' ที่ประกาศใน db.ts → หาทุกแถวของร้านนี้แล้วลบ
  } catch { /* ไม่มีอะไรทำต่อ */ }
}
// ⚠ ยังไม่มีใครเรียกฟังก์ชันนี้ — จะต่อตอน logout ในขั้นถัดไป

// ---------- ตัวหลัก ----------

export async function fetchWithSnapshot<T>(
  tenantSlug: string | undefined,     // ร้านปัจจุบัน (undefined = ยังไม่ login)
  kind: SnapshotKind,                 // ชนิดข้อมูล
  fetcher: () => Promise<T>,          // ฟังก์ชันที่เรียก API จริง — ไม่ต้องรู้เรื่อง cache เลย
): Promise<CachedResult<T>> {

  if (!tenantSlug) {
    return { data: await fetcher(), isStale: false };
    // ไม่รู้ว่าร้านไหน → ไม่ยุ่งกับ cache เรียก API ตรง ๆ (error ก็โยนตามปกติ)
  }

  try {
    const data = await fetcher();                  // ① ลอง server ก่อน
    void saveSnapshot(tenantSlug, kind, data);
    // ② สำเร็จ → บันทึก snapshot
    // void = ตั้งใจไม่รอ (ไม่ await) — หน้าจอแสดงผลได้ทันที การเขียนดิสก์ทำเบื้องหลัง
    return { data, isStale: false };

  } catch (error) {
    if (!isUnreachableError(error)) throw error;
    // ③ server ตอบปฏิเสธ (401/403/404...) → โยน error เดิมต่อ ห้ามใช้ cache

    const cached = await readSnapshot<T>(tenantSlug, kind);   // ④ ติดต่อไม่ได้ → หา snapshot
    if (!cached) throw error;
    // ⑤ ไม่เคยมี snapshot ของร้านนี้ → โยน error เดิมต่อ (hook จะเปลี่ยนเป็นข้อความไทยเอง)

    return { data: cached.data, isStale: true, savedAt: cached.savedAt };   // ⑥ ใช้ snapshot
  }
}
```

**ทำไมแยก `fetcher` เป็นพารามิเตอร์** — ฟังก์ชันนี้ไม่รู้ว่า API คืออะไร ใช้ได้กับทุกข้อมูล ขั้นเมนูจะเรียกแบบเดียวกัน

```ts
fetchWithSnapshot(tenantSlug, 'menu', async () => (await apiFetch('/menu/full', token)).data)
```

---

### 2.3 `features/offline/components/StaleDataBanner.tsx` — แถบเตือนข้อมูลเก่า

```tsx
import { RefreshCw, WifiOff } from 'lucide-react';

interface StaleDataBannerProps {
  label: string;           // "ข้อมูลโต๊ะ" / "เมนู" — ทำให้ component เดียวใช้ได้ทุกหน้า
  savedAt: number;         // เวลาที่บันทึก snapshot
  onRetry?: () => void;    // ? = ไม่บังคับ ไม่ส่งมาก็ไม่แสดงปุ่ม
  isRetrying?: boolean;
}

const timeFormat = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });
// Intl = API จัดรูปแบบวันที่/ตัวเลขตามภาษาที่มากับ browser → "00:12"
// สร้างไว้นอก component → ไม่สร้างใหม่ทุกครั้งที่ render
const dateTimeFormat = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
// → "29 ต.ค. 00:12"

function formatSavedAt(savedAt: number): string {
  const saved = new Date(savedAt);
  const isToday = saved.toDateString() === new Date().toDateString();
  return isToday ? timeFormat.format(saved) : dateTimeFormat.format(saved);
  // วันเดียวกัน → แค่เวลา · ข้ามวัน → มีวันที่ด้วย (ข้อมูลข้ามวัน = เก่ามาก ต้องเห็นชัด)
}

export default function StaleDataBanner({ label, savedAt, onRetry, isRetrying = false }: StaleDataBannerProps) {
  return (
    <div role="status" aria-live="polite" className="... bg-[#F3EDE4] ...">
      <WifiOff ... aria-hidden="true" />
      {/* aria-hidden = ไอคอนตกแต่ง ไม่ต้องให้ screen reader อ่าน */}
      <p className="flex-1">
        <span className="font-medium">ติดต่อเซิร์ฟเวอร์ไม่ได้</span>
        <span> · แสดง{label} ณ {formatSavedAt(savedAt)} น. สถานะอาจไม่ตรงกับปัจจุบัน</span>
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={isRetrying}
                className="cursor-pointer ... transition-colors duration-200 ... focus-visible:ring-2 ...">
          {/* ตามกฎ AGENTS.md: cursor-pointer, transition 150–300ms, focus state */}
          <RefreshCw className={isRetrying ? 'animate-spin' : ''} />
          ลองใหม่
        </button>
      )}
    </div>
  );
}
```

**ทำไมต้องมีแถบนี้ทุกครั้งที่ใช้ snapshot**: ถ้าแสดงข้อมูลเก่าเงียบ ๆ พนักงานจะเชื่อว่าโต๊ะ A2 ว่าง ทั้งที่อีกเครื่องเพิ่งเปิดบิลไป — ระบบที่ "ดูเหมือนทำงาน" แต่ข้อมูลผิดอันตรายกว่าระบบที่บอกตรง ๆ ว่ามีปัญหา

---

### 2.4 `features/tables/hooks/useTables.ts`

```ts
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../../libs/appClient'
import { useAuth } from '../../auth/context/AuthContext'
import { fetchWithSnapshot, isUnreachableError } from '../../offline/snapshotCache'   // ใหม่
import type { DiningTable } from '../types/table.types'

interface TablesResponse { status: string; data: DiningTable[] }

export function useTables() {
    const { accessToken, user } = useAuth()        // เดิมดึงแค่ accessToken — เพิ่ม user
    const tenantSlug = user?.tenantSlug             // ใหม่: ร้านปัจจุบัน ใช้เป็น key ของ snapshot
    const [tables, setTables] = useState<DiningTable[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [staleSince, setStaleSince] = useState<number | null>(null)
    // ใหม่: null = ข้อมูลสด · ตัวเลข = กำลังแสดง snapshot ที่บันทึกเมื่อเวลานั้น

    const load = useCallback(
        async (silent = false) => {
            if (!silent) setIsLoading(true)
            setError(null)
            try {
                // เดิม: const res = await apiFetch('/tables', accessToken); setTables(res.data)
                const result = await fetchWithSnapshot(tenantSlug, 'tables', async () => {
                    const res = await apiFetch<TablesResponse>('/tables', accessToken)
                    return res.data                    // คืนแค่ array โต๊ะ ไม่เก็บ { status } ลง snapshot
                })
                setTables(result.data)
                setStaleSince(result.isStale ? result.savedAt : null)
            } catch (err) {
                if (isUnreachableError(err)) {
                    // มาถึงตรงนี้ = ติดต่อไม่ได้ และไม่มี snapshot ของร้านนี้เลย
                    setError('ติดต่อเซิร์ฟเวอร์ไม่ได้ และยังไม่มีผังโต๊ะที่บันทึกไว้ในเครื่องนี้')
                    // แทนข้อความ "Failed to fetch" ภาษาอังกฤษที่พนักงานไม่เข้าใจ
                } else {
                    setError(err instanceof Error ? err.message : 'โหลดข้อมูลโต๊ะไม่สำเร็จ')   // เหมือนเดิม
                }
            } finally {
                setIsLoading(false)
            }
        },
        [accessToken, tenantSlug],   // เพิ่ม tenantSlug: เปลี่ยนร้าน → load ใหม่
    )

    useEffect(() => { load() }, [load])

    return { tables, isLoading, error, staleSince, reload: () => load(false) }   // เพิ่ม staleSince
}
```

---

### 2.5 `features/shifts/hooks/useShift.ts` (เฉพาะส่วนที่เปลี่ยน)

**ทำไมต้องแคชกะด้วย**: (1) `TablesPage` เรียก `useShift()` อยู่แล้ว (2) ขั้น outbox ต้องรู้ `shiftId` ตอนออฟไลน์ เพื่อผูกออเดอร์กับกะ (ตรวจ `SHIFT_MISMATCH` ตอน sync)

```ts
import { fetchWithSnapshot, saveSnapshot } from '../../offline/snapshotCache';   // ใหม่

const { accessToken, user } = useAuth();
const tenantSlug = user?.tenantSlug;
const [staleSince, setStaleSince] = useState<number | null>(null);   // ใหม่ — ความหมายเดียวกับ useTables

// ---- load ----
const result = await fetchWithSnapshot(tenantSlug, 'currentShift', async () => {
  const response = await shiftsApi.getCurrent(accessToken);
  return response.data;      // Shift | null — null (ยังไม่เปิดกะ) ก็ถูกบันทึกด้วย
});
setShift(result.data);
setStaleSince(result.isStale ? result.savedAt : null);

// ---- helper ใหม่ ----
const applyShift = (next: Shift | null) => {
  setShift(next);                // อัปเดตหน้าจอ (เหมือน setShift เดิม)
  setStaleSince(null);           // ได้คำตอบจาก server แล้ว = ข้อมูลสด
  if (tenantSlug) void saveSnapshot(tenantSlug, 'currentShift', next);
  // อัปเดต snapshot ทันที — ไม่งั้นเปิดกะแล้วเน็ตหลุด snapshot ยังบอกว่า "ไม่มีกะ"
};

// openShift / closeShift / verifyWithPin: เปลี่ยน setShift(response.data) → applyShift(response.data)

return { ..., staleSince, ... };   // คืน staleSince ออกไปด้วย
```

---

### 2.6 `features/tables/pages/TablesPage.tsx` (เฉพาะส่วนที่เปลี่ยน)

```tsx
import StaleDataBanner from '../../offline/components/StaleDataBanner'   // ใหม่

const { tables, isLoading, error, staleSince, reload } = useTables()       // + staleSince

const { shift, isLoading: isShiftLoading, isSubmitting, error: shiftError,
        staleSince: shiftStaleSince, openShift } = useShift()
// staleSince: shiftStaleSince = เปลี่ยนชื่อตอนดึงออกมา (ชนกับ staleSince ของโต๊ะ)

const needOpenShift = !isShiftLoading && !shiftError && shiftStaleSince === null && shift === null
//                                                     ^^^^^^^^^^^^^^^^^^^^^^^^^ ใหม่
// เดิม: ไม่มีกะ → เด้ง popup "เปิดกะ"
// ปัญหา: ออฟไลน์ + snapshot บอกว่าไม่มีกะ → เด้ง popup → กดเปิดกะ → ล้ม (ต้องใช้ server)
// ใหม่: ข้อมูลกะมาจาก snapshot → ไม่เด้ง

{/* วางระหว่างหัว "ผังโต๊ะ" กับตารางโต๊ะ */}
{!isLoading && !error && staleSince !== null && (
  // แสดงเมื่อ: โหลดเสร็จ + ไม่มี error + ข้อมูลมาจาก snapshot
  <div className="mb-4 font-kanit">
    <StaleDataBanner label="ข้อมูลโต๊ะ" savedAt={staleSince} onRetry={reload} />
  </div>
)}
```

---

### 2.7 `features/auth/context/AuthContext.tsx` — แก้ 1 จุด

**ปัญหาที่เจอตอนทดสอบ**: ออฟไลน์แล้วกด F5 → snapshot ไม่ถูกใช้เลย

สาเหตุ: ตอนเปิดแอป `restore()` จะลอง refresh token

```
เปิดแอป → restore() → refreshOnce() → fetch('/api/auth/refresh')
                                         └─ ออฟไลน์ → TypeError → เข้า catch
catch เดิม: ไม่ทำอะไรเลย → user = null → tenantSlug = undefined
          → fetchWithSnapshot ไม่รู้ว่าร้านไหน → ไม่อ่าน cache → error
```

```tsx
}catch{
      // เดิม: มีแค่คอมเมนต์ ไม่ได้ทำอะไร
      setUser(getSavedUser());
      // ใหม่: ดึง user ที่บันทึกไว้ใน sessionStorage ตอน login ครั้งก่อนมาใช้
      // ผล: รู้ว่าเป็นร้านไหน → อ่าน snapshot ได้ · แต่ accessToken ยังเป็น null
}
```

**ปลอดภัยไหม?** ปลอดภัย เพราะ

1. ได้แค่ข้อมูลที่ **เครื่องนี้เคยโหลดมาแล้ว** ตอน login ถูกต้อง
2. พอเน็ตกลับมา request แรกไป server โดยไม่มี token → ได้ 401 → `appClient` เรียก `refreshOnce()` เอง → ได้ token ใหม่ → ยิงซ้ำ → สำเร็จ (ทดสอบแล้ว)
3. ถ้า refresh token หมดอายุด้วย → `onSessionExpired()` → พาไปหน้า login ตามเดิม
4. ข้อมูลทุกอย่างที่ส่งขึ้น server ยังผ่าน JWT guard + permission guard + RLS เหมือนเดิม

ตรงกับที่ตัดสินไว้: "ให้ใช้ user ใน session ทำงานต่อตอนออฟไลน์ได้"

---

### 2.8 `main.tsx`

```tsx
import { requestPersistentStorage } from './features/offline/db';

requestPersistentStorage();
// เรียกครั้งเดียวตอนแอปเริ่ม ก่อน render
// ขอสิทธิ์ให้ browser ไม่ลบ IndexedDB เอง (รายละเอียดใน 2.1)
```

---

## 3. ลำดับเหตุการณ์จริง

### ฉาก A — เปิดแอปครั้งแรก (ออนไลน์)

1. Chrome โหลด `index.html` + JS + CSS จาก server
2. `UpdatePrompt` ลงทะเบียน `sw.js` → SW ดาวน์โหลด 20 ไฟล์เก็บใน Cache Storage → กล่อง "พร้อมใช้งานออฟไลน์"
3. login → ไปหน้าโต๊ะ → `useTables` เรียก `/api/tables` สำเร็จ → แสดงผัง + บันทึก snapshot `demo/tables`
4. `useShift` เรียก `/api/shifts/current` สำเร็จ → บันทึก snapshot `demo/currentShift`

### ฉาก B — backend ล่มกลางวัน (หน้าเปิดค้างอยู่)

1. พนักงานกด "รีเฟรช" → `fetch('/api/tables')` → Vite proxy ต่อ backend ไม่ได้ → ตอบ 500
2. `apiFetch` โยน `ApiError(500)` → `isUnreachableError` = true → อ่าน snapshot
3. ผังโต๊ะยังอยู่ + แถบ "ติดต่อเซิร์ฟเวอร์ไม่ได้ · แสดงข้อมูลโต๊ะ ณ 14:32 น."

### ฉาก C — เน็ตหลุด แล้วมีคนกด F5

1. Chrome ขอ `/demo/tables` → **SW ตอบ `index.html` จาก cache** (navigateFallback)
2. JS / CSS / ฟอนต์ มาจาก cache ทั้งหมด → แอปขึ้น
3. `AuthContext.restore()` → refresh ล้ม (TypeError) → `setUser(getSavedUser())` → รู้ว่าเป็นร้าน `demo`
4. `useTables` → fetch ล้ม → snapshot `demo/tables` → ผังโต๊ะขึ้นพร้อมแถบเตือน

### ฉาก D — เน็ตกลับมา

1. กด "ลองใหม่" → `apiFetch('/tables', null)` (ยังไม่มี token) → 401
2. `appClient` → `refreshOnce()` → ได้ token ใหม่ → ยิงซ้ำ → 200
3. ข้อมูลสด + บันทึก snapshot ใหม่ + แถบเตือนหาย

### ฉาก E — session หมดอายุจริง

1. `/api/tables` → 401 → refresh → 401
2. `isUnreachableError(401)` = false → **ไม่ใช้ snapshot**
3. `onSessionExpired()` → พาไปหน้า login

---

## 4. ทดสอบด้วยตัวเอง

### เตรียม

```powershell
cd D:\PWA-POS
npm install                                     # ต้องรันที่ root
cd backend;  npx nest start --watch             # terminal 1
cd frontend; npm run build; npm run preview     # terminal 2 → http://localhost:4173
```

> `npm run dev` **ไม่มี SW** — ทดสอบ PWA ต้องใช้ `build` + `preview` เสมอ

### Checklist

| # | ทำ | ต้องเห็น |
|---|---|---|
| 1 | เปิด `localhost:4173` | กล่อง "พร้อมใช้งานออฟไลน์" มุมขวาล่าง |
| 2 | F12 > Application > Manifest | ชื่อ "ค้าคล่อง POS" + ไอคอน 4 ขนาด ไม่มีคำเตือนสีแดง |
| 3 | Application > Service Workers | `sw.js` — activated and is running |
| 4 | Application > Cache Storage | `workbox-precache-v2-...` มี 20 รายการ |
| 5 | ไอคอน ⊕ ขวาแถบ URL > ติดตั้ง | แอปเปิดเป็นหน้าต่างแยก |
| 6 | login → หน้าโต๊ะ · Application > IndexedDB > `pwa-pos` > `snapshots` | 2 แถว: `[ร้าน, tables]`, `[ร้าน, currentShift]` |
| 7 | หยุด backend (Ctrl+C) → กด "รีเฟรช" | ผังโต๊ะเดิม + แถบเตือน |
| 8 | Network > เลือก **Offline** → F5 | แอปขึ้น ผังโต๊ะเดิม + แถบเตือน |
| 9 | เปิด backend + ตั้ง **No throttling** → "ลองใหม่" | ข้อมูลสด แถบหาย |
| 10 | แก้ข้อความอะไรก็ได้ → `npm run build` → กลับไปหน้าเดิม รอสักครู่ / F5 | กล่อง "มีเวอร์ชันใหม่" |

### ถ้างง cache

Application > Storage > **Clear site data** = ล้าง SW + Cache Storage + IndexedDB + sessionStorage ทั้งหมด แล้วเริ่มใหม่

---

## 5. ข้อจำกัดที่รู้อยู่ + งานถัดไป

### ข้อจำกัดตอนนี้

| เรื่อง | ผล | แก้เมื่อไหร่ |
|---|---|---|
| หน้า `mainpos` ยังไม่แคชเมนู | กดโต๊ะตอนออฟไลน์ไปได้ แต่เมนูว่าง | ขั้นถัดไป |
| เปิดบิลออฟไลน์ไม่ได้ | `MainPOS` ยิง `GET /tables` + `POST /orders` ตรง | ขั้น outbox (รอเพื่อน merge MainPOS) |
| สถานะโต๊ะใน snapshot ไม่เปลี่ยนเมื่อสั่งออฟไลน์ | กดโต๊ะเดิมซ้ำอาจได้บิลที่ 2 | ขั้น outbox — อัปเดต snapshot ตอนเข้าคิว |
| ยังไม่ลบ snapshot ตอน logout | ข้อมูลร้านค้างในเครื่อง (ไม่หลุดข้ามร้านเพราะ key แยกร้าน) | ต่อ `clearTenantSnapshots` ใน logout |
| JS หลัก 3 MB | เปิดแอปครั้งแรกช้า + ต้องขยายเพดาน precache | lazy import `thailand-address.json` (โค้ดของเพื่อน) |
| ไม่มี route guard | เปิด `/ร้านใดก็ได้/tables` โดยไม่ login ก็เห็นหน้า (ข้อมูลไม่มีเพราะ 401) | แยกงาน — ควรแจ้งเพื่อน |
| เปิดแอปครั้งแรกตอนออฟไลน์ไม่ได้ | ต้อง login ออนไลน์อย่างน้อย 1 ครั้ง | ข้อจำกัดโดยธรรมชาติ — เขียนลง scope |
| ESLint error เดิม 2 จุดในไฟล์ที่แตะ | `set-state-in-effect` (useTables), `only-export-components` (AuthContext) | มีมาก่อน ไม่ได้เกิดจากรอบนี้ |

### ลำดับงานถัดไป

1. **แคชเมนู** — `useFullMenu.ts` ใช้ `fetchWithSnapshot(..., 'menu', ...)` (ต้องเพิ่ม `'menu'` ใน `SnapshotKind`) · ถามเพื่อนก่อนแตะไฟล์
2. **OfflineBanner + useNetworkStatus** — แถบบอกสถานะออฟไลน์ระดับทั้งแอป
3. **ลบ snapshot ตอน logout**
4. **Outbox + flush** — เขียนแยก ทดสอบเอง
5. **ต่อเข้า MainPOS** — หลังเพื่อน merge

---

## 6. คำถามที่กรรมการน่าจะถาม

**Q: ทำไมไม่ให้ Service Worker แคช API ไปเลย ง่ายกว่า**
A: SW ใช้ URL เป็น key แต่ระบบเป็น multi-tenant ที่แยกร้านด้วย JWT ไม่ใช่ URL — `GET /api/tables` ของทุกร้านคือ URL เดียวกัน ถ้าแคชที่ SW เครื่องที่เคยใช้ 2 ร้านจะเห็นข้อมูลข้ามร้าน เราจึงเก็บใน IndexedDB โดยใช้ `[tenantSlug, kind]` เป็น key

**Q: ข้อมูลในแคชอาจไม่ตรงความจริง ไม่อันตรายเหรอ**
A: อันตรายถ้าแสดงเงียบ ๆ จึงแสดงแถบเตือนพร้อมเวลาทุกครั้ง และ server ยังเป็นผู้ตัดสินสุดท้าย — ตอน sync ถ้าโต๊ะมีบิลแล้ว DB จะปฏิเสธ (409) ไม่สร้างบิลซ้อน

**Q: ทำไม 401 ไม่ใช้แคช**
A: 401 แปลว่า server ตอบแล้วว่าไม่อนุญาต ไม่ใช่ติดต่อไม่ได้ ถ้าใช้แคช คนที่ session หมดหรือถูกปิดบัญชีจะยังเห็นข้อมูลร้าน

**Q: ออฟไลน์แล้วใช้ user ที่เก็บไว้ ไม่ข้ามการยืนยันตัวตนเหรอ**
A: ได้เห็นแค่ข้อมูลที่เครื่องนี้โหลดมาแล้วตอน login ถูกต้อง ทุกอย่างที่ส่งขึ้น server ยังต้องผ่าน JWT + permission guard + RLS และ `created_by` มาจาก JWT ตอน sync ไม่ใช่จาก client

**Q: ทำไมใช้ `registerType: 'prompt'` ไม่ใช่ `autoUpdate`**
A: `autoUpdate` reload หน้าทันทีที่มีเวอร์ชันใหม่ — กลางการสั่งอาหารตะกร้าจะหาย POS ต้องให้พนักงานเลือกจังหวะเอง

**Q: ระบบจริงใช้แนวทางนี้ไหม**
A: Workbox เป็นไลบรารีของ Google ที่ใช้ทำ PWA กันแพร่หลาย · Network First + แคชสำรองเป็นหนึ่งใน strategy มาตรฐานในเอกสาร Workbox · POS อย่าง Loyverse และ Square รองรับการขายตอนออฟไลน์แล้ว sync ภายหลังด้วยแนวคิดเดียวกัน (เก็บในเครื่อง → ส่งเมื่อเน็ตกลับ)

---

## 7. อภิธานศัพท์

| คำ | ความหมาย |
|---|---|
| PWA | เว็บที่ติดตั้งเป็นแอปได้ + ทำงานออฟไลน์ได้ |
| Manifest | ไฟล์ JSON บอกชื่อ ไอคอน วิธีเปิดของแอป |
| Service Worker (SW) | สคริปต์เบื้องหลังที่ดัก request ของหน้าเว็บ |
| Workbox | ไลบรารีของ Google สร้าง SW ให้ |
| Precache | ไฟล์ที่ SW โหลดเก็บล่วงหน้าตั้งแต่ครั้งแรก |
| Runtime cache | ไฟล์ที่ SW เก็บระหว่างใช้งาน |
| Secure context | HTTPS หรือ localhost — SW และ `crypto.randomUUID()` ใช้ได้เฉพาะที่นี่ |
| IndexedDB | ฐานข้อมูลใน browser เก็บ object ได้ ขนาดใหญ่ async |
| Dexie | ไลบรารีห่อ IndexedDB ให้ใช้ง่าย |
| Snapshot | สำเนาข้อมูล ณ เวลาที่โหลดสำเร็จครั้งล่าสุด |
| Stale | ข้อมูลเก่า (อาจไม่ตรงปัจจุบัน) |
| Network First | ถาม server ก่อน ล้มค่อยใช้ cache |
| Cache First | ใช้ cache ก่อน ไม่มีค่อยถาม server |
| Compound key | primary key ที่ประกอบจากหลายคอลัมน์ |
| Opaque response | response ข้ามโดเมนที่อ่าน status ไม่ได้ (status = 0) |
| Outbox | คิวในเครื่องเก็บสิ่งที่ต้องส่งขึ้น server เมื่อเน็ตกลับมา (ยังไม่ได้ทำ) |
