import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/login_pages';
import Register_page from '../features/registerOwner/pages/register_pages';
import MainPOS from '../features/mainpos/pages/MainPOS';
import KDSPage from '../features/kds/pages/KDSPage';
import { MenuEdit } from '../features/editMenu/pages/menu_edit';
import SettingPage from '../features/auth/pages/Setting_page';
import SiftworkPage from '../features/auth/pages/Siftwork_page';
import StockPage from '../features/auth/pages/Stock_page';
import SaleReportPage from '../features/auth/pages/Sale_report_page';
import EditModiferPage from '../features/editModifer/pages/edit_modifer_pages';

export function AppRouter() {
    return (
        <Routes>
            <Route path='/' element={<LoginPage />} />
            <Route path='/:tenantSlug/login' element={<LoginPage />} />
            <Route path='/register' element={<Register_page />} />
            <Route path='/:tenantSlug/homepage' element={<div>Dashboard (TODO)</div>} />
            <Route path='/mainpos' element={<MainPOS />} />
            <Route path='/:tenantSlug/mainpos' element={<MainPOS />} />
            <Route path='/kds' element={<KDSPage />} />
            <Route path='/:tenantSlug/kds' element={<KDSPage />} />
            <Route path='/:tenantSlug/setting/menu' element={<MenuEdit />} />
            <Route path='/:tenantSlug/setting/modifier' element={<EditModiferPage />} />
            <Route path='/setting' element={<SettingPage />} />
            <Route path='/siftwork' element={<SiftworkPage />} />
            <Route path='/stock' element={<StockPage />} />
            <Route path='/sale-report' element={<SaleReportPage />} />
        </Routes>
    );
}
