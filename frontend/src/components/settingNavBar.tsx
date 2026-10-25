import { NavLink, useParams } from 'react-router-dom';

export default function SettingNavBar(){
    const {tenantSlug} = useParams();
    return (
        <nav>
            <ul className="flex bg-[#FAF7F2] gap-4 p-4">
                <li>
                    <NavLink to={`/${tenantSlug}/setting/store`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        ร้านอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/vat`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        อัตราค่าบริการ
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/tables`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        โต๊ะอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/menu`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        เมนูอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/modifier`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        ตัวเลือกเสริม
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/users`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        บัญชีผู้ใช้
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        การเงิน
                    </NavLink>
                </li>
            </ul>
        </nav>
    )
}
