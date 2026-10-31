import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
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
import TableSettingPage from '../features/tableSetting/pages/TableSettingPage';
import StoreSettingPage from '../features/store/pages/StoreSettingPage';

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
            <Route path='/:tenantSlug/setting/menu' element={<MenuEdit />} />
            <Route path='/:tenantSlug/setting/modifier' element={<EditModiferPage />} />
            <Route path='/:tenantSlug/setting/users' element={<UsersPage />} />
            <Route path='/:tenantSlug/setting/tables' element={<TableSettingPage />} />
            <Route path='/:tenantSlug/setting/store' element={<StoreSettingPage />} />
            <Route path='/:tenantSlug/siftwork' element={<ShiftPage />} />
            <Route path='/:tenantSlug/stock' element={<StockPage />} />
            <Route path='/:tenantSlug/sale-report' element={<SaleReportPage />} />
            <Route path='/:tenantSlug/setting/vat' element={<EditVat/>}/>
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
