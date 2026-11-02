import { useState } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { ChevronDown, Check } from 'lucide-react';

interface SettingMenuItem {
    path: string;
    label: string;
    ownerOnly?: boolean;
}

const ALL_SETTINGS: SettingMenuItem[] = [
    { path: 'store', label: 'ร้านอาหาร', ownerOnly: true },
    { path: 'vat', label: 'อัตราค่าบริการ', ownerOnly: true },
    { path: 'tables', label: 'โต๊ะอาหาร' },
    { path: 'menu', label: 'เมนูอาหาร' },
    { path: 'modifier', label: 'ตัวเลือกเสริม' },
    { path: 'printer', label: 'เครื่องพิมพ์' },
    { path: 'users', label: 'บัญชีผู้ใช้', ownerOnly: true },
];

export default function SettingNavBar() {
    const { tenantSlug } = useParams<{ tenantSlug: string }>();
    const { user } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const isOwner = user?.role?.toLowerCase() === 'owner';
    const availableItems = ALL_SETTINGS.filter((item) => !item.ownerOnly || isOwner);

    // หาเมนูที่กำลังเปิดใช้งานอยู่
    const currentItem =
        availableItems.find((item) => location.pathname.endsWith(`/setting/${item.path}`)) ||
        availableItems[0];

    const baseClass =
        'inline-flex items-center justify-center whitespace-nowrap shrink-0 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer';
    const activeClass =
        `${baseClass} bg-[#8C6D58] text-white shadow-xs font-semibold border border-[#8C6D58]`;
    const inactiveClass =
        `${baseClass} bg-white/80 hover:bg-white text-stone-600 hover:text-[#2D241E] border border-stone-200/80 hover:border-stone-300`;

    return (
        <nav aria-label="แถบตั้งค่าระบบ" className="w-full max-w-full shrink-0 bg-[#FAF7F2] border-b border-stone-200/80 font-kanit z-20">
            {/* ── Desktop View (md ขึ้นไป): ปุ่มเมนูเรียงแนวนอน ไร้ไอคอน ── */}
            <div className="hidden md:block w-full overflow-x-auto no-scrollbar">
                <ul className="flex items-center gap-2 px-6 py-2.5">
                    {availableItems.map((item) => (
                        <li key={item.path} className="shrink-0">
                            <NavLink
                                to={`/${tenantSlug}/setting/${item.path}`}
                                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                            >
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </div>

            {/* ── Mobile View (< md): Dropdown Selector เห็นครบทุกเมนูในคลิกเดียว ── */}
            <div className="md:hidden px-4 py-2.5 relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-[#d9c6b0] rounded-xl text-sm font-medium text-[#2D241E] shadow-2xs hover:border-[#8C6D58] transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-stone-400 font-normal shrink-0">หมวดหมู่:</span>
                        <span className="font-semibold text-[#8C6D58] truncate">{currentItem.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 font-normal shrink-0">
                        <span>เปลี่ยนหมวด</span>
                        <ChevronDown className={`w-4 h-4 text-[#8C6D58] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* Dropdown Menu แสดงทุกหมวดหมู่การตั้งค่า */}
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute left-4 right-4 top-full mt-1.5 z-50 bg-white border border-[#E8DFD5] rounded-2xl shadow-xl overflow-hidden py-1 divide-y divide-stone-100 animate-in fade-in zoom-in-95 duration-150">
                            {availableItems.map((item) => {
                                const isSelected = currentItem.path === item.path;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={`/${tenantSlug}/setting/${item.path}`}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-[#FAF7F2] text-[#8C6D58] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-[#8C6D58] stroke-[2.5]" />
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}
