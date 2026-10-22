import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/login_pages';
import Register_page from '../features/registerOwner/pages/register_pages';
import MainPOS from '../features/mainpos/pages/MainPOS';
import KDSPage from '../features/kds/pages/KDSPage';
import { MenuEdit } from '../features/editMenu/pages/menu_edit';
import { ShiftPage } from '../features/shifts';
import { StockPage } from '../features/inventory';
import SaleReportPage from '../features/saleReport/pages/SaleReportPage';
import EditModiferPage from '../features/editModifer/pages/edit_modifer_pages';
import TablesPage from '../features/tables/pages/TablesPage';
import UsersPage from '../features/users/pages/UsersPage';
import TableSettingPage from '../features/tableSetting/pages/TableSettingPage';

export function AppRouter() {
    return (
        <Routes>
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
            <Route path='/:tenantSlug/siftwork' element={<ShiftPage />} />
            <Route path='/:tenantSlug/stock' element={<StockPage />} />
            <Route path='/:tenantSlug/sale-report' element={<SaleReportPage />} />
        </Routes>
    );
}
