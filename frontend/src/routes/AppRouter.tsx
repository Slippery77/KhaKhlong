import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/login_pages';
import Register_page from '../features/registerOwner/pages/register_pages';
import MainPOS from '../features/mainpos/pages/MainPOS';
import KDSPage from '../features/kds/pages/KDSPage';
import { MenuEdit } from '../features/editMenu/pages/menu_edit';
import SiftworkPage from '../features/auth/pages/Siftwork_page';
import { StockPage } from '../features/inventory';
import SaleReportPage from '../features/saleReport/pages/SaleReportPage';
import EditModiferPage from '../features/editModifer/pages/edit_modifer_pages';
import TablesPage from '../features/tables/pages/TablesPage';

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
            <Route path='/:tenantSlug/siftwork' element={<SiftworkPage />} />
            <Route path='/stock' element={<StockPage />} />
            <Route path='/:tenantSlug/stock' element={<StockPage />} />
            <Route path='/sale-report' element={<SaleReportPage />} />
            <Route path='/:tenantSlug/sale-report' element={<SaleReportPage />} />
        </Routes>
    );
}
