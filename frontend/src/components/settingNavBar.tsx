import { NavLink, useParams } from 'react-router-dom';

export default function SettingNavBar(){
    const {tenantSlug} = useParams();
    return (
        <nav>
            <ul className="flex bg-[#FAF7F2] gap-4 p-4">
                <li>
<<<<<<< HEAD
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'border-2 border-transparent p-2 text-stone-500'}
                >
                ร้านอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/vat`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'border-2 border-transparent p-2 text-stone-500'}
                >
                อัตราค่าบริการ
=======
                    <NavLink to={`/${tenantSlug}/setting/store`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        ร้านอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        อัตราค่าบริการ
>>>>>>> origin/feat-aod
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/tables`}
<<<<<<< HEAD
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'border-2 border-transparent p-2 text-stone-500'}
                >
                โต๊ะอาหาร
=======
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        โต๊ะอาหาร
>>>>>>> origin/feat-aod
                    </NavLink>
                </li>
                <li>
<<<<<<< HEAD
                    <NavLink 
                        to={`/${tenantSlug}/setting/menu`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#bfa48f] p-2' : 'border-2 border-transparent p-2 text-stone-500 hover:bg-[#c66d24ca] rounded-xl'}
                >
                เมนูอาหาร
=======
                    <NavLink to={`/${tenantSlug}/setting/menu`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        เมนูอาหาร
>>>>>>> origin/feat-aod
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/modifier`}
<<<<<<< HEAD
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'border-2 border-transparent p-2 text-stone-500'}
                >
                ตัวเลือกเสริม
=======
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        ตัวเลือกเสริม
>>>>>>> origin/feat-aod
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/setting/users`}
<<<<<<< HEAD
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'border-2 border-transparent p-2 text-stone-500'}
                >
                บัญชีผู้ใช้
=======
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        บัญชีผู้ใช้
>>>>>>> origin/feat-aod
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
<<<<<<< HEAD
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'border-2 border-transparent p-2 text-stone-500'}
                >
                การเงิน
=======
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500 p-2'}
                    >
                        การเงิน
>>>>>>> origin/feat-aod
                    </NavLink>
                </li>
            </ul>
        </nav>
    )
}
