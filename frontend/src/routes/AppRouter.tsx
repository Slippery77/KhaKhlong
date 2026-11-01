import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/login_pages';
import StoreFinderPage from '../features/auth/pages/store_finder_page';
import Register_page from '../features/registerOwner/pages/register_pages';
import MainPOS from '../features/mainpos/pages/MainPOS';
import KDSPage from '../features/kds/pages/KDSPage';
import { MenuEdit } from '../features/editMenu/pages/menu_edit';
import { ShiftPage } from '../features/shifts';
import { StockPage } from '../features/inventory';
import SaleReportPage from '../features/saleReport/pages/SaleReportPage';
import EditModiferPage from '../features/editModifer/pages/edit_modifer_pages';
import TablesPage from '../features/tables/pages/TablesPage';
import EditVat from '../features/editVat/pages/editVat';
import UsersPage from '../features/users/pages/UsersPage';
import AuditLogsPage from '../features/auditLogs/AuditLogsPage';
import TableSettingPage from '../features/tableSetting/pages/TableSettingPage';
import StoreSettingPage from '../features/store/pages/StoreSettingPage';
import { SettingRouteGuard } from './SettingRouteGuard';
import { AuditRouteGuard } from './AuditRouteGuard';
import { useAuth } from '../features/auth/context/AuthContext';

// นำทางหน้าเริ่มต้นตามบทบาท: เจ้าของร้านไป '/:tenantSlug/setting/store', ผู้จัดการไป '/:tenantSlug/setting/tables'
function SettingIndexRedirect() {
    const { tenantSlug } = useParams<{ tenantSlug: string }>();
    const { user } = useAuth();
    const role = user?.role?.toLowerCase();
    const defaultSubpath = role === 'manager' ? 'tables' : 'store';
    const target = tenantSlug ? `/${tenantSlug}/setting/${defaultSubpath}` : `/${defaultSubpath}`;
    return <Navigate to={target} replace />;
}

// [ใหม่] วางก่อน export function AppRouter
// หน้าทดสอบ outbox — มีเฉพาะตอน npm run dev
// import.meta.env.DEV ถูกแทนเป็น false ตอน build → lazy(import(...)) ถูกตัดทิ้ง ไม่มีใน bundle จริง
const OutboxDevPage = import.meta.env.DEV
    ? lazy(() => import('../features/offline/pages/OutboxDevPage'))
    : null;

export function AppRouter() {
    return (
        <Routes>
            {/* หน้าแรก: เด้งเข้าร้านที่เครื่องนี้จำไว้ หรือให้กรอกรหัสร้าน */}
            <Route path='/' element={<StoreFinderPage />} />
            <Route path='/login' element={<StoreFinderPage />} />
            <Route path='/:tenantSlug/login' element={<LoginPage />} />
            <Route path='/register' element={<Register_page />} />
            <Route path='/:tenantSlug/homepage' element={<div>Dashboard (TODO)</div>} />
            <Route path='/:tenantSlug/tables' element={<TablesPage />} />
            <Route path='/:tenantSlug/mainpos' element={<MainPOS />} />
            <Route path='/:tenantSlug/kds' element={<KDSPage />} />

            {/* เส้นทางตั้งค่าระบบ — เฉพาะเจ้าของร้านและผู้จัดการเท่านั้น (พนักงานถูกบล็อกด้วย SettingRouteGuard) */}
            <Route path='/:tenantSlug/setting' element={<SettingRouteGuard />}>
                <Route index element={<SettingIndexRedirect />} />
                <Route path='store' element={<StoreSettingPage />} />
                <Route path='vat' element={<EditVat />} />
                <Route path='tables' element={<TableSettingPage />} />
                <Route path='menu' element={<MenuEdit />} />
                <Route path='modifier' element={<EditModiferPage />} />
                <Route path='users' element={<UsersPage />} />
                <Route path='*' element={<SettingIndexRedirect />} />
            </Route>

            {/* บันทึกประวัติความปลอดภัย (Audit Logs) — แยกออกจาก Settings ชัดเจน (AUD-05) */}
            <Route path='/:tenantSlug/audit-logs' element={<AuditRouteGuard />}>
                <Route index element={<AuditLogsPage />} />
            </Route>

            <Route path='/:tenantSlug/siftwork' element={<ShiftPage />} />
            <Route path='/:tenantSlug/stock' element={<StockPage />} />
            <Route path='/:tenantSlug/sale-report' element={<SaleReportPage />} />

            {/* URL ที่ไม่รู้จัก: กลับไปหน้าเลือกร้าน ดีกว่าปล่อยจอขาว */}
            {OutboxDevPage && (
                <Route
                    path='/:tenantSlug/dev/outbox'
                    element={<Suspense fallback={null}><OutboxDevPage /></Suspense>}
                />
            )}
            <Route path='*' element={<StoreFinderPage />} />
        </Routes>
    );
}
