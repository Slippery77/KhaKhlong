# AGENTS.md — PWA-POS (ค้าคล่อง / KhaKhlong)

## เริ่มงานทุกครั้ง

1. อ่าน `docs/HANDOFF.md` — สรุปสถานะล่าสุด + งานค้าง P0/P1/P2 + decision สำคัญ
2. `docs/backend-todo.md` และ `docs/daily-update-2026-10-21.md` **ล้าสมัยแล้ว** อย่าใช้เป็นแหล่งอ้างอิง
3. `git status` ก่อนแก้ทุกครั้ง ห้ามทับงานที่ยังไม่ commit
4. Branch หลัก: `feat-aod` · Remote: `Slippery77/KhaKhlong`

## Stack

| ส่วน | รายละเอียด |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind v4 · port 5173 · proxy `/api` → 3000 |
| Backend | NestJS 11 · port 3000 · prefix `/api` |
| Database | PostgreSQL 18 · db `pwa_pos` · user `pos_app` |

## กติกาที่ห้ามพลาด

- API response convention: `{ status: 'success', data: ... }`
- **ห้ามคำนวณ VAT / service charge / ยอดรวมใน NestJS หรือ client** — DB trigger เป็นผู้คำนวณ
- ทุก endpoint ต้องมี permission guard และพึ่ง RLS ผ่าน `app_tenant_id()`
- Backend โครงสร้าง 3 ชั้น: controller → service → repository (ดู `docs/backend-dev-guide.md`)
- UI: bg `#FAF7F2`, accent `#8C6D58`, hover `#7a5c45`, text `#2D241E`, border `#d9c6b0` / `#E8DFD5`, font Kanit, `rounded-xl` / `rounded-2xl`
- ห้ามใช้ emoji เป็นไอคอน → ใช้ `lucide-react`
- ทุกจุดคลิกต้องมี `cursor-pointer`, hover transition 150–300 ms, focus state, label/aria ครบ

## เทสต์และตรวจสอบ

- E2E เขียนเป็น **Node `.mjs` เท่านั้น** (PowerShell ทำให้ UTF-8 เพี้ยน)
- `npx jest` (backend) ปัจจุบันยังแดงบาง suite จาก boilerplate — ดู `docs/HANDOFF.md` หัวข้อ 6
- ก่อน commit: backend `npx tsc --noEmit` · frontend `npx tsc -b` ต้องผ่าน

## เอกสารสำคัญ

- สถานะ/งานค้าง: `docs/HANDOFF.md`
- Endpoint guides: `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`
- กฎธุรกิจ/ขอบเขต: `docs/business-rules-pos-updated.md`, `docs/scope_pwa_pos_v2_2.md`
- สิทธิ์ผู้ใช้: `docs/user-roles-permissions.md`
