import { NavLink, useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';

export default function SettingNavBar() {
    const { tenantSlug } = useParams<{ tenantSlug: string }>();
    const { user } = useAuth();
    const isOwner = user?.role?.toLowerCase() === 'owner';

    const activeClass = 'font-kanit text-[#FFFFFF] border-2 border-[#B79479] rounded-xl bg-[#B79479] px-3.5 py-1.5 transition-colors shadow-xs';
    const inactiveClass = 'text-stone-500 hover:text-[#8C6D58] px-3.5 py-1.5 transition-colors rounded-xl hover:bg-[#EFE8DC]/50';

    return (
        <nav aria-label="แถบตั้งค่าระบบ">
            <ul className="flex bg-[#FAF7F2] gap-2 p-4 border-b border-stone-200/60 overflow-x-auto text-sm font-kanit">
                {/* เฉพาะเจ้าของร้าน (Owner only) */}
                {isOwner && (
                    <>
                        <li>
                            <NavLink
                                to={`/${tenantSlug}/setting/store`}
                                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                            >
                                ร้านอาหาร
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to={`/${tenantSlug}/setting/vat`}
                                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                            >
                                อัตราค่าบริการ
                            </NavLink>
                        </li>
                    </>
                )}

                {/* ทั้งเจ้าของร้านและผู้จัดการ (Owner + Manager) */}
                <li>
                    <NavLink
                        to={`/${tenantSlug}/setting/tables`}
                        className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                    >
                        โต๊ะอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to={`/${tenantSlug}/setting/menu`}
                        className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                    >
                        เมนูอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to={`/${tenantSlug}/setting/modifier`}
                        className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                    >
                        ตัวเลือกเสริม
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to={`/${tenantSlug}/setting/printer`}
                        className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                    >
                        เครื่องพิมพ์
                    </NavLink>
                </li>

                {/* เฉพาะเจ้าของร้าน (Owner only) */}
                {isOwner && (
                    <li>
                        <NavLink
                            to={`/${tenantSlug}/setting/users`}
                            className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                        >
                            บัญชีผู้ใช้
                        </NavLink>
                    </li>
                )}
            </ul>
        </nav>
    );
}
