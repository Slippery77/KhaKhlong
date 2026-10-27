# AGENTS.md — PWA-POS (ค้าคล่อง / KhaKhlong)

## เริ่มงานทุกครั้ง

1. อ่าน `docs/HANDOFF.md` — สรุปสถานะล่าสุด + งานค้าง P0/P1/P2 + decision สำคัญ
2. เช็ค `git status` — ต้องเป็น **clean working tree** บน `main` ที่ `git pull` แล้ว. หากมีไฟล์ค้างให้ตรวจสอบก่อนเริ่มงาน
3. `docs/backend-todo.md` และ `docs/daily-update-2026-10-21.md` **ล้าสมัยแล้ว** อย่าใช้เป็นแหล่งอ้างอิง
4. Branch หลัก: `main` (`origin/main` = `78d3c8e`, 2026-10-27) · Remote: `https://github.com/Slippery77/PWA-POS.git` (branch เก่า `feat-aod`, `feat-benz`)
5. ติดตั้ง dependency ด้วย `npm ci` ที่ **root** (npm workspaces) — รันในโฟลเดอร์ย่อยอย่างเดียว dependency ไม่ครบ

## Stack

| ส่วน | รายละเอียด |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind v4 · port 5173 · proxy `/api` → 3000 |
| Backend | NestJS 11 · port 3000 · prefix `/api` |
| Database | PostgreSQL 18 · db `pwa_pos` · user `pos_app` · รหัสผ่านอยู่ใน `.env` |

## งานด่วนปัจจุบัน (P0)

**ไม่มี P0 ค้าง** — ทั้ง 3 ข้อด้านล่างอยู่ใน `main` แล้ว งานถัดไปคือ P1 / P2 ใน `docs/HANDOFF.md` หัวข้อ 5

1. ~~หน้าพิมพ์ใบเสร็จ/พิมพ์ซ้ำฝั่ง FE~~ ✅ เสร็จแล้ว (`69ffbb2`) — `frontend/src/features/receipt/` + ปุ่มใน `PaymentModal` / `BillDetailModal`
2. ~~Store finder + จำรหัสร้าน~~ ✅ เสร็จแล้ว (`50657d4`) — route `/`, `/login`, `GET /api/public/tenants/:slug`, จำใน `localStorage`, catch-all route
3. ~~PIN ผู้ใช้งาน (สร้าง/แก้ไข)~~ ✅ เสร็จแล้ว (`bd022fe`) — มีช่อง PIN ใน `UserFormPopup`, รองรับทั้งสร้างและแก้ไข, แสดง badge `has_pin` ใน `UserTable`, backend รองรับครบถ้วน · ยังไม่มี E2E ของ PIN

## กติกาที่ห้ามพลาด

- API response convention: `{ status: 'success', data: ... }`
- **ห้ามคำนวณ VAT / service charge / ยอดรวมใน NestJS หรือ client** — DB trigger เป็นผู้คำนวณ; PaymentModal ใช้ `attempt.amount` จาก server
- Payment: จองบิลด้วย `POST /payments/attempts` → `.../pay` หรือ `.../cancel`; ปิด modal ต้อง cancel attempt เสมอ; จ่ายซ้ำคืนใบเสร็จเดิม
- Reports: อ่านจาก `payments` / `cash_movements` / `shifts` และกรอง `app_tenant_id()` เสมอ; `cashOnHand = opening_cash + cash_sales + cash_in − cash_out`
- ทุก endpoint ต้องมี permission guard และพึ่ง RLS ผ่าน `app_tenant_id()`; ใช้ `@RequireAnyPermission(...)` เมื่อต้องมีสิทธิ์อย่างใดอย่างหนึ่ง
- Backend โครงสร้าง 3 ชั้น: controller → service → repository (ดู `docs/backend-dev-guide.md`)
- ห้ามเขียนรหัสผ่าน DB หรือ secret จริงลงเอกสาร/โค้ด — อ้าง `.env` แทน
- UI: bg `#FAF7F2`, accent `#8C6D58`, hover `#7a5c45`, text `#2D241E`, border `#d9c6b0` / `#E8DFD5`, font Kanit, `rounded-xl` / `rounded-2xl`
- ห้ามใช้ emoji เป็นไอคอน → ใช้ `lucide-react`
- ทุกจุดคลิกต้องมี `cursor-pointer`, hover transition 150–300 ms, focus state, label/aria ครบ

## เทสต์และตรวจสอบ

- E2E เขียนเป็น **Node `.mjs` เท่านั้น** (PowerShell ทำให้ UTF-8 เพี้ยน) → `backend/test/e2e/` (ใน repo ตอนนี้: `e2e-reports.mjs`, `e2e-receipt.mjs`, `e2e-public-tenant.mjs`)
- `npx tsc --noEmit` (backend) และ `npx tsc -b` (frontend) **ผ่านอยู่** ต้องรักษาให้ผ่านก่อน commit
- `npx jest` (backend) ยังแดง **9 suites / 9 tests** (ผ่าน 6 suites / 16 tests) จาก spec boilerplate ขาด DI mock — ดู `docs/HANDOFF.md` หัวข้อ 6
- `npx eslint` ยังแดงทั้งสองฝั่ง (backend 4,782 problems ส่วนใหญ่ prettier, frontend 40 problems — นับ 2026-10-27) — อย่าเพิ่ง auto-fix ปนกับ feature commit
- `node backend/test/e2e/e2e-reports.mjs` ต้องมี backend + DB จริงรันอยู่

## เอกสารสำคัญ

- สถานะ/งานค้าง: `docs/HANDOFF.md`
- Endpoint guides: `docs/payment-module-guide.md`, `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`, `docs/system-config-guide.md`
- กฎธุรกิจ/ขอบเขต: `docs/business-rules-pos-updated.md`, `docs/scope_pwa_pos_v2_2.md`
- สิทธิ์ผู้ใช้: `docs/user-roles-permissions.md`
