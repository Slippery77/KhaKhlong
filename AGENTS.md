# AGENTS.md — PWA-POS (ค้าคล่อง / KhaKhlong)

## เริ่มงานทุกครั้ง

1. อ่าน `docs/HANDOFF.md` — สรุปสถานะล่าสุด + งานค้าง P0/P1/P2 + decision สำคัญ
2. เช็ค `git status` — ปัจจุบันมีงาน **Reports/Payment ค้างไม่ commit** (untracked: `backend/src/modules/reports/`, `backend/test/e2e/`, `frontend/src/features/saleReport/api/`) ห้าม `git clean` / checkout ทับ
3. `docs/backend-todo.md` และ `docs/daily-update-2026-10-21.md` **ล้าสมัยแล้ว** อย่าใช้เป็นแหล่งอ้างอิง
4. Branch หลัก: `main` · Remote: `Slippery77/KhaKhlong` (branch เก่า `feat-aod`, `feat-benz`)

## Stack

| ส่วน | รายละเอียด |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind v4 · port 5173 · proxy `/api` → 3000 |
| Backend | NestJS 11 · port 3000 · prefix `/api` |
| Database | PostgreSQL 18 · db `pwa_pos` · user `pos_app` |

## งานด่วนปัจจุบัน (P0)

1. Commit งาน Reports + Payment fix + E2E ที่ค้างใน working tree
2. PIN ผู้จัดการ: เพิ่ม `pin` ใน `UpdateUserDTO` + hash ใน service + ช่อง PIN ใน `UserFormPopup`
3. หน้าพิมพ์ใบเสร็จ/พิมพ์ซ้ำฝั่ง FE (backend `GET /payments/:id/receipt` + `POST /payments/:id/print` พร้อมแล้ว)

## กติกาที่ห้ามพลาด

- API response convention: `{ status: 'success', data: ... }`
- **ห้ามคำนวณ VAT / service charge / ยอดรวมใน NestJS หรือ client** — DB trigger เป็นผู้คำนวณ; PaymentModal ใช้ `attempt.amount` จาก server
- Payment: จองบิลด้วย `POST /payments/attempts` → `.../pay` หรือ `.../cancel`; ปิด modal ต้อง cancel attempt เสมอ; จ่ายซ้ำคืนใบเสร็จเดิม
- Reports: อ่านจาก `payments` / `cash_movements` / `shifts` และกรอง `app_tenant_id()` เสมอ; `cashOnHand = opening_cash + cash_sales + cash_in − cash_out`
- ทุก endpoint ต้องมี permission guard และพึ่ง RLS ผ่าน `app_tenant_id()`; ใช้ `@RequireAnyPermission(...)` เมื่อต้องมีสิทธิ์อย่างใดอย่างหนึ่ง
- Backend โครงสร้าง 3 ชั้น: controller → service → repository (ดู `docs/backend-dev-guide.md`)
- UI: bg `#FAF7F2`, accent `#8C6D58`, hover `#7a5c45`, text `#2D241E`, border `#d9c6b0` / `#E8DFD5`, font Kanit, `rounded-xl` / `rounded-2xl`
- ห้ามใช้ emoji เป็นไอคอน → ใช้ `lucide-react`
- ทุกจุดคลิกต้องมี `cursor-pointer`, hover transition 150–300 ms, focus state, label/aria ครบ

## เทสต์และตรวจสอบ

- E2E เขียนเป็น **Node `.mjs` เท่านั้น** (PowerShell ทำให้ UTF-8 เพี้ยน) → `backend/test/e2e/`
- `npx tsc --noEmit` (backend) และ `npx tsc -b` (frontend) **ผ่านอยู่** ต้องรักษาให้ผ่านก่อน commit
- `npx jest` (backend) ยังแดง **9 suites / 9 tests** จาก spec boilerplate ขาด DI mock — ดู `docs/HANDOFF.md` หัวข้อ 6
- `npx eslint` ยังแดงทั้งสองฝั่ง (backend ~4.6k problems ส่วนใหญ่ prettier, frontend 39 problems) — อย่าเพิ่ง auto-fix ปนกับ feature commit
- `node backend/test/e2e/e2e-reports.mjs` ต้องมี backend + DB จริงรันอยู่

## เอกสารสำคัญ

- สถานะ/งานค้าง: `docs/HANDOFF.md`
- Endpoint guides: `docs/payment-module-guide.md`, `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`, `docs/system-config-guide.md`
- กฎธุรกิจ/ขอบเขต: `docs/business-rules-pos-updated.md`, `docs/scope_pwa_pos_v2_2.md`
- สิทธิ์ผู้ใช้: `docs/user-roles-permissions.md`
