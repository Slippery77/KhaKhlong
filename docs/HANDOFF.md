# HANDOFF � PWA-POS (��Ҥ��ͧ / KhaKhlong)

> ���������ػʶҹ�����ش����Ѻ **�Դ᪷�������Ƿӧҹ���** ������ͧ���Һ�Ժ�����
> �ѻവ: 2026-10-28 ? ��᷹ docs/backend-todo.md (����������������)

## �Ը����᪷����

��������¤����繢�ͤ����á:

`	ext
��ҹ docs/HANDOFF.md ��͹ ���Ƿӧҹ��ͨҡ��Ǣ��  �ҹ��ҧ P0 ��� 1
`

---

## 1. ��������ਡ��

| ��¡�� | ��� |
|---|---|
| Path | C:\Users\chira\OneDrive\�ʡ��ͻ\Final-Project\PWA-POS |
| Branch | eat-aod (branch ��� eat-aod, eat-benz, main �ѧ����) |
| HEAD | 78d3c8e � Merge pull request #15 from Slippery77/feat-benz |
| Remote | https://github.com/Slippery77/KhaKhlong.git |
| Working tree | ���������� (��� commit) � ����Ǣ�� 3.7 |
| Frontend | React + TypeScript + Vite + Tailwind v4 ? dev port **5173** ? proxy /api  http://localhost:3000 |
| Backend | NestJS 11 ? port **3000** ? prefix /api ? Swagger �Դ |
| Database | PostgreSQL 18 ? db pwa_pos ? user pos_app / 123456 |

### ����觷�������

`powershell
# �ѹ backend (terminal 1)
cd backend; npx nest start --watch

# �ѹ frontend (terminal 2)
cd frontend; npm run dev

# type-check / build
cd backend;  npx tsc --noEmit
cd frontend; npx tsc -b; npx vite build

# test
cd backend; npx jest

# E2E (��ͧ�� backend �ѹ����)
node backend/test/e2e/e2e-reports.mjs
`

---

## 2. ʶҹ������

### ���������ҹ��

- **Auth** � login/logout/refresh token, JWT guard, permission guard, RLS + tenant isolation ? **store finder ��� /** (��������ҹ� localStorage, ��Ǩ slug �Ѻ server ��͹��� login)
- **Register** � ��Ѥ���ҹ���� (throttle 3 ���� / 5 �ҷ� / IP)
- **Menu** � ��Ǵ/����/ modifiers �ú endpoint
- **Floors / Tables** � ��鹷�� ��� �ѧ��ҹ
- **Orders** � create, list (open), get by id, add items (+kitchen ticket), move table, close-unpaid, sync
- **Inventory** � stock view, movements (�Ѻ���/��Ѻ/�ͧ����), **count batch** (�ͺ����ش)
- **Shifts** � open, current, close, verify (PIN ���Ѵ���/��Ңͧ), reopen, cashbook, list
- **KDS** � ��Ǥ��� + mark ready
- **System Config** � GET/PATCH
- **Tenants / Store** � GET/PATCH + ˹�� setting/store
- **Users** � list, create, update, deactivate, reactivate ? **���ҧ�����䢼������� PIN ��** (��� DTO, service hash, UI)
- **Roles / Permissions** � seed �ú, employee 9 �Է���
- **Payment** � ttempts (�ͧ���)  pay (�Թʴ/QR)  cancel; �͡�Ţ�����, �������, �ѹ�֡��þ����/�������; UI PaymentModal 3 ��� ���ʹ�ҡ server ��ҹ��
- **Receipt (FE)** � features/receipt/ �����ǡ�д�� 80mm + ������ԧ��ҹ window.print(), ���� ���� ��� isCopy, ��þ max_reprints; �� ReceiptModal/ReceiptPaper/useReceipt/receipt.api �ú��ǹ (TypeScript ��ҹ)
- **Reports** � sales/summary, sales/by-period, sales/top-items, sales/transactions, sales/receipt/:id; ˹�� Sale Report ��� API ��ԧ����
- **Store Finder (Phase 1)** � ��辺� branch �Ѩ�غѹ (feat-aod)

### �ѧ�������� / �ѧ���ú

- **Audit Logs** � ����� endpoint/UI
- **PWA/Offline** � ����� manifest, service worker
- **Dashboard** — เอาออกแล้ว
- **Reports �������** � ˹����§ҹ��¡�/����ѵԡ�, ��ǡ�ͧ��ǧ�ѹ��� ��� export

---

## 3. �ҹ����ش

### 3.1 Receipt / ���������� (��������)
- Backend: payment_cols ���� at_rate_snapshot, service_charge_rate_snapshot, 
ounding_adjustment (���ʤ�����������)
- Frontend rontend/src/features/receipt/: ReceiptPaper, ReceiptModal, useReceipt, 
eceipt.api, 
eceipt.print.css
- ���������� PaymentModal (step done) ��� BillDetailModal (�������)
- E2E ackend/test/e2e/e2e-receipt.mjs ��ͺ����

### 3.2 Store Finder (Phase 1) (��������)
- Backend: GET /api/public/tenants/:slug (public-tenants.controller.ts) - @Public(), throttle
- Frontend: store_finder_page.tsx, 	enantStorage.ts, publicTenant.api.ts
- �ѹ�֡������ҹ� localStorage, route / ��� /login redirect �ѵ��ѵ�

### 3.3 Reports (��������)
- Backend module 
eports/ �ú
- Frontend ��� API ��ԧ����
- E2E e2e-reports.mjs ������

### 3.4 �ҹ��������� commit (feat-aod)

`	ext
modified:   backend/src/modules/auth/auth.module.ts      # export JwtModule
modified:   backend/src/modules/auth/auth.service.ts      # ��Ѻ�� (��ͤ����ºҧ��ǹ + ��èѴ�ٻẺ)
modified:   backend/src/modules/auth/guards/jwtAuth.guard.ts # ź�����Դ���/��Ѻ��
modified:   backend/src/modules/reports/reports.controller.ts # ź @UseGuards(JwtAuthGuard) ���
modified:   backend/src/modules/users/users.repository.ts  # ���� findByIdWithTokenVersion
modified:   frontend/src/features/registerOwner/components/register_OwnerInfo.tsx
modified:   frontend/src/features/registerOwner/components/register_RestaurantForm.tsx
modified:   frontend/src/features/users/components/UserFormPopup.tsx  # ��Ѻ layout PIN
`

---

## 4. �ҹ��ҧ P0

### P0-1. ��Ǩ�ͺ/��Ѻ��ا PIN ���Ѵ���
**ʶҹ�:** �������� - Backend hash pin � create/update, frontend �� PinInput � UserFormPopup, validation �ú��ǹ

### P0-2. Store Finder Phase 1
**ʶҹ�:** ��辺� branch �Ѩ�غѹ (feat-aod)

### P0-3. Receipt - ��Ǩ�ͺ��������ó�
**ʶҹ�:** �������� - features/receipt/ �ú��ǹ, TypeScript ��ҹ


---

## 5. �ҹ��ҧ P1 / P2

### P1 � �����١��ͧ��Ф�����ʹ���
- **GET /shifts �� report:view_all** � ������: ͹حҵ `report:view_all` ���� `report:view_own_shift` ��С�ͧ��� employee ���੾�Сз�����ͧ�Դ
- **PIN lock ��褧��** � ������: ������� `users.pin_failed_attempts` / `users.pin_locked_until` Ẻ per-user, ��͡ 5 �ҷ�����ͼԴ 5 ����, �ѹ�֡/�Ŵ��͡��ҹ UsersRepository
- **����� cron `escalate_overdue_shifts()`** � ������: ���� `ShiftEscalationService` ���¡ `escalate_overdue_shifts()` �ء 5 �ҷ�
- **token_version / session revocation** � ������: JWT guard ��� query DB ��ѧ�Ѻ����� claim token_version; `TenantContextInterceptor` ��º `users.token_version` + `is_active` � transaction; `AuthService` ��� token_version � access/refresh; refresh token �١�Ѻ token_version ��л���ʸ������ç (patch DB `PATCH_06_refresh_token_version.sql`). token ��ҷ������� claim ��ͧ login ����; ����¹���ʼ�ҹ/�Դ��ҹ = session �����������ѹ��.
- **POST /orders/sync �Ѻ @Body() dto: any** (��Ǩ�ͺ�鴻Ѩ�غѹ��辺 endpoint ���)
- **/:tenantSlug/homepage** — เอาออกแล้ว

### P2
- **PWA/Offline**: manifest + service worker
- **Reports ����ʹ**: ��§ҹ��¡�, ��ǡ�ͧ, export
- **Dashboard homepage** — เอาออกแล้ว
- **Orders**: void/comp ��¡��
- **Audit Log endpoint/UI**

---

## 6. �س�Ҿ / �ʵ� / �͡���

| ��¡�� | ʶҹ� |
|---|---|
| Backend 
px tsc --noEmit | **��ҹ** |
| Frontend 
px tsc -b | **��ҹ** |
| Backend 
px jest | **ᴧ�ҡ spec boilerplate �Ҵ DI mock** |
| Backend 
px eslint | **~4,642 problems** |
| Frontend 
px eslint | **39 problems** |
| E2E ��ԧ | e2e-reports.mjs, e2e-receipt.mjs, e2e-public-tenant.mjs ������ (��ͧ�ѹ�Ѻ backend+DB ��ԧ) |

**�����˵�:** 
- E2E ��ͧ��¹�� Node .mjs ��ҹ��
- �����ӹǳ VAT/service charge � NestJS/client � DB trigger �ӹǳ
- API response { status: 'success', data: ... }
- �ء endpoint ��ͧ�� permission guard + RLS ��ҹ pp_tenant_id()
- �� @RequireAnyPermission(...) ����Ѻ�Է������ҧ����ҧ˹��

---

## 7. �ӴѺ����йӶѴ�

1. **��Ǩ�ͺ�������¹�ŧ�Ѩ�غѹ** � �� diff �ͧ����������з��ͺ
2. **Commit �ҹ������** ��Ҿ���� (�����¡ commit ���������)
3. **��� P1** ��������Ӥѭ
4. **���ͺ E2E** �������Ǣ�ͧ

> ��͹������ҹ�ء����: git status ��ͧ�������էҹ��ҧ����, �ѹ 
px tsc --noEmit (backend) ��� 
px tsc -b (frontend) ����ҹ��͹ commit

