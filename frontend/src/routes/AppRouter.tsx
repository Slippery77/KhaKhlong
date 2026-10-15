import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/login_pages';
import Register_page from '../features/registerOwner/pages/register_pages';
import MainPOS from '../features/mainpos/pages/MainPOS';
import KDSPage from '../features/kds/pages/KDSPage';
import { MenuEdit } from '../features/editMenu/pages/menu_edit';

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
            <Route path='/:tenantSlug/menu/admin' element={<MenuEdit />} />
            <Route path='/menu/admin' element={<MenuEdit />} />

        </Routes>
    );
}
