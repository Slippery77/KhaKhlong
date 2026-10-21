import { NavLink, useParams } from 'react-router-dom';

export default function SettingNavBar(){
    const {tenantSlug} = useParams();
    return (
        <nav>
            <ul className="flex bg-[#FAF7F2] gap-4 p-3">
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479]' : 'text-stone-500'}
                >
                ร้านอาหาร
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479]' : 'text-stone-500'}
                >
                อัตราค่าบริการ
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479]' : 'text-stone-500'}
                >
                โต๊ะอาหาร
                    </NavLink>
                </li>        
                <li>
                    <NavLink 
                        to={`/${tenantSlug}/setting/menu`}
                        className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500'}
                >
                เมนูอาหาร
                    </NavLink>
                </li>  
                <li>
                    <NavLink to={`/${tenantSlug}/setting/modifier`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479] p-2' : 'text-stone-500'}
                >
                ตัวเลือกเสริม
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479]' : 'text-stone-500'}
                >
                บัญชีผู้ใช้
                    </NavLink>
                </li>
                <li>
                    <NavLink to={`/${tenantSlug}/fake-path-test`}
                    className={({isActive})=> isActive ? 'font-kanit text-[#FFFFFF] border-2 rounded-xl bg-[#B79479]' : 'text-stone-500'}
                >
                การเงิน
                    </NavLink>
                </li>     
            </ul>
        </nav>
    )
}