# AGENTS.md — PWA-POS (ค้าคล่อง / KhaKhlong)

## เริ่มงานทุกครั้ง

1. อ่าน `docs/HANDOFF.md` — สรุปสถานะล่าสุด + งานค้าง P0/P1/P2 + decision สำคัญ
2. เช็ค `git status` — ต้องรู้ว่ามีไฟล์ที่แก้ไข/untracked อะไรก่อนเริ่มงาน
3. `docs/backend-todo.md` และ `docs/daily-update-2026-10-21.md` **ล้าสมัยแล้ว** อย่าใช้เป็นแหล่งอ้างอิง
4. Branch หลัก: `main` (integration branch) · งานปัจจุบันอยู่บน `feat-aod` · Remote: `Slippery77/KhaKhlong`
5. ติดตั้ง dependency ด้วย `npm ci` ที่ **root** (npm workspaces) — รันในโฟลเดอร์ย่อยอย่างเดียว dependency ไม่ครบ

## Stack

| ส่วน | รายละเอียด |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind v4 · port 5173 · proxy `/api` → 3000 |
| Backend | NestJS 11 · port 3000 · prefix `/api` |
| Database | PostgreSQL 18 · db `pwa_pos` · user `pos_app` · รหัสผ่านอยู่ใน `.env` |

## งานด่วนปัจจุบัน (P0)

**ไม่มี P0 ค้าง** — งานที่เหลือเป็น P1 / P2 ดู `docs/HANDOFF.md`

1. ~~หน้าพิมพ์ใบเสร็จ/พิมพ์ซ้ำฝั่ง FE~~ เสร็จแล้ว — `frontend/src/features/receipt/` + ปุ่มใน `PaymentModal` / `BillDetailModal`
2. ~~Store finder + จำรหัสร้าน~~ เสร็จแล้ว — route `/`, `/login`, `GET /api/public/tenants/:slug`, จำใน `localStorage`, catch-all route
3. ~~PIN ผู้ใช้งาน (สร้าง/แก้ไข)~~ เสร็จแล้ว — ช่อง PIN ใน `UserFormPopup`, badge `has_pin` ใน `UserTable`, backend hash เป็น `pin_hash`
4. ~~Void / Comp รายการอาหารพร้อม PIN ผู้อนุมัติ~~ เสร็จแล้ว — `POST /orders/items/void` · `POST /orders/items/comp`, ดู `docs/void-comp-approval-guide.md`

## กติกาที่ห้ามพลาด

- API response convention: `{ status: 'success', data: ... }`
- **ห้ามคำนวณ VAT / service charge / ยอดรวมใน NestJS หรือ client** — DB trigger เป็นผู้คำนวณ; PaymentModal ใช้ `attempt.amount` จาก server
- Payment: จองบิลด้วย `POST /payments/attempts` → `.../pay` หรือ `.../cancel`; ปิด modal ต้อง cancel attempt เสมอ; จ่ายซ้ำคืนใบเสร็จเดิม
- Void / Comp: ต้องมี PIN ผู้จัดการ/เจ้าของร้านทุกครั้ง (void = `void:approve`, comp = `discount:approve`); `*_by` เก็บ "ผู้อนุมัติ" ไม่ใช่คนกด; ตัวนับ PIN ผิดต้องเขียนด้วย `DbContextService.durableQuery` เท่านั้น (403 จะ rollback transaction ทิ้ง)
- Reports: อ่านจาก `payments` / `cash_movements` / `shifts` และกรอง `app_tenant_id()` เสมอ; `cashOnHand = opening_cash + cash_sales + cash_in − cash_out`
- ทุก endpoint ต้องมี permission guard และพึ่ง RLS ผ่าน `app_tenant_id()`; ใช้ `@RequireAnyPermission(...)` เมื่อต้องมีสิทธิ์อย่างใดอย่างหนึ่ง
- Backend โครงสร้าง 3 ชั้น: controller → service → repository (ดู `docs/backend-dev-guide.md`)
- ห้ามเขียนรหัสผ่าน DB หรือ secret จริงลงเอกสาร/โค้ด — อ้าง `.env` แทน
- UI: bg `#FAF7F2`, accent `#8C6D58`, hover `#7a5c45`, text `#2D241E`, border `#d9c6b0` / `#E8DFD5`, font Kanit, `rounded-xl` / `rounded-2xl`
- ห้ามใช้ emoji เป็นไอคอน → ใช้ `lucide-react`
- ทุกจุดคลิกต้องมี `cursor-pointer`, hover transition 150–300 ms, focus state, label/aria ครบ

## เทสต์และตรวจสอบ

- E2E เขียนเป็น **Node `.mjs` เท่านั้น** (PowerShell ทำให้ UTF-8 เพี้ยน) → `backend/test/e2e/` (`e2e-reports.mjs`, `e2e-receipt.mjs`, `e2e-public-tenant.mjs`, `e2e-token-version.mjs`, `e2e-void-comp.mjs`)
- `npx tsc --noEmit` (backend) และ `npx tsc -b` (frontend) **ต้องผ่าน** ก่อน commit
- `npx jest` (backend) ยังมี spec boilerplate ที่แดงเพราะขาด DI mock — อย่าใช้ผลรวมทั้งชุดตัดสินงาน ให้รันเฉพาะ suite ที่แก้ (`npx jest <module>`) และดู `docs/HANDOFF.md`
- `npx eslint` ยังแดงทั้งสองฝั่ง (ส่วนใหญ่เป็น prettier) — อย่าเพิ่ง auto-fix ปนกับ feature commit; ไฟล์ที่แตะต้อง lint สะอาด
- E2E ต้องมี backend + DB จริงรันอยู่ (เช่น `node backend/test/e2e/e2e-void-comp.mjs`)

## เอกสารสำคัญ

- สถานะ/งานค้าง: `docs/HANDOFF.md`
- Void / Comp + PIN ผู้อนุมัติ: `docs/void-comp-approval-guide.md`
- Endpoint guides: `docs/payment-module-guide.md`, `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`, `docs/system-config-guide.md`
- กฎธุรกิจ/ขอบเขต: `docs/business-rules-pos-updated.md`, `docs/scope_pwa_pos_v2_2.md`
- สิทธิ์ผู้ใช้: `docs/user-roles-permissions.md`
