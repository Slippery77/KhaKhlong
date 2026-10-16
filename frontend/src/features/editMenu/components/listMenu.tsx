import { Pencil, EyeOff } from 'lucide-react';
import type { MenuItem } from "../types/menu.types";

interface Props{
    menuItem: MenuItem[];
    showInactive: boolean;
    search: string;
    onToggleAvailable: (item: MenuItem) => void;   // สวิตช์ พร้อมขาย/หมดวันนี้ (is_available)
    onDisable: (item: MenuItem) => void;           // ปุ่มตาขีดฆ่า = เลิกขาย (is_active = false)
    onEnable: (item: MenuItem) => void;            // ปุ่มเปิดขายอีกครั้ง (is_active = true)
    onEdit: (item: MenuItem) => void;              // ปุ่มดินสอ
}

export default function ListMenuEdit ({menuItem, showInactive, search, onToggleAvailable, onDisable, onEnable, onEdit}:Props){
    const keyword = search.trim().toLowerCase();
    const filterMenu = menuItem
        .filter(menu => showInactive || menu.is_active)
        .filter(menu => keyword === '' || menu.name.toLowerCase().includes(keyword))
        // เมนูที่เลิกขายไปอยู่ล่างสุด
        .sort((a, b) => Number(b.is_active) - Number(a.is_active));

    return (
        <div className="overflow-hidden rounded-2xl border border-[#e5d9c8] bg-white">
            <table className="w-full text-sm">
                <thead className="bg-[#f3eadf] text-xs text-stone-500">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium">ชื่อเมนู</th>
                        <th className="px-4 py-3 text-right font-medium">ราคา</th>
                        <th className="px-4 py-3 text-left font-medium">ตัวเลือก</th>
                        <th className="px-4 py-3 text-left font-medium">สถานะวันนี้</th>
                        <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                {filterMenu.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-stone-400">ไม่มีเมนู</td>
                    </tr>
                )}
                {filterMenu.map(m=>(
                    <tr
                        key={m.menu_item_id}
                        className={`border-t border-[#efe6da] ${m.is_active ? '' : 'bg-[#f3eee7]'}`}
                    >
                        {/* ชื่อเมนู + คำอธิบาย */}
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#2D241E]">{m.name}</span>
                                {!m.is_active && (
                                    <span className="rounded-full bg-[#e5d9c8] px-2 py-0.5 text-[11px] text-[#8C6D58]">เลิกขาย</span>
                                )}
                            </div>
                            {m.description && (
                                <p className="text-xs text-stone-500">{m.description}</p>
                            )}
                        </td>

                        {/* ราคา */}
                        <td className="px-4 py-3 text-right font-semibold text-[#8C6D58]">
                            ฿{m.price}
                        </td>

                        {/* ตัวเลือก */}
                        <td className="px-4 py-3 text-stone-500">
                            {m.modifier_group_ids.length > 0
                                ? `ตัวเลือก ${m.modifier_group_ids.length} กลุ่ม`
                                : 'ยังไม่มีตัวเลือก'}
                        </td>

                        {/* สถานะวันนี้ */}
                        <td className="px-4 py-3">
                            {m.is_active ? (
                                <label className="flex cursor-pointer items-center gap-2">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={m.is_available}
                                        onClick={() => onToggleAvailable(m)}
                                        className={`relative h-6 w-11 rounded-full transition hover:opacity-90 ${
                                            m.is_available ? 'bg-[#5f7a52]' : 'bg-[#8a7a6c]'
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                                m.is_available ? 'left-5.5' : 'left-0.5'
                                            }`}
                                        />
                                    </button>
                                    <span className="text-[#2D241E]">{m.is_available ? 'พร้อมขาย' : 'หมดวันนี้'}</span>
                                </label>
                            ) : (
                                <span className="text-stone-500">ไม่แสดงตอนสั่งอาหาร</span>
                            )}
                        </td>

                        {/* จัดการ */}
                        <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                                {m.is_active ? (
                                    <>
                                        <button
                                            type="button"
                                            title="แก้ไข"
                                            onClick={() => onEdit(m)}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9c6b0] text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-95"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            title="เลิกขาย"
                                            onClick={() => onDisable(m)}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9c6b0] text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-95"
                                        >
                                            <EyeOff size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onEnable(m)}
                                        className="rounded-xl border border-[#b08968] bg-white px-3 py-1.5 text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-95"
                                    >
                                        เปิดขายอีกครั้ง
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
