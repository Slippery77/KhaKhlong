import { useState } from 'react';
import { Pencil, EyeOff, Utensils, SlidersHorizontal, ImagePlus } from 'lucide-react';
import type { MenuItem } from "../types/menu.types";

export type MenuStatusFilter = 'all' | 'available' | 'sold_out' | 'inactive';

interface Props {
    menuItem: MenuItem[];
    statusFilter: MenuStatusFilter;
    search: string;
    onToggleAvailable: (item: MenuItem) => void;
    onDisable: (item: MenuItem) => void;
    onEnable: (item: MenuItem) => void;
    onEdit: (item: MenuItem) => void;
    onLinkModifiers: (item: MenuItem) => void;
}

function MenuThumbnail({
    item,
    onClick,
}: {
    item: MenuItem;
    onClick: () => void;
}) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const hasImage = Boolean(item.image_url && item.image_url !== failedUrl);

    return (
        <button
            type="button"
            onClick={onClick}
            title="คลิกเพื่อแก้ไขเมนู / เปลี่ยนรูป"
            className="group relative h-13 w-13 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-[#e0d3c1] bg-[#f4ede2] transition-all duration-200 hover:border-[#8C6D58] hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
        >
            {hasImage ? (
                <img
                    src={item.image_url!}
                    alt={item.name}
                    loading="lazy"
                    onError={() => setFailedUrl(item.image_url ?? null)}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-[#9C8671]">
                    <Utensils size={18} className="transition-opacity group-hover:opacity-0" />
                    <ImagePlus
                        size={18}
                        className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#8C6D58]"
                    />
                </div>
            )}
        </button>
    );
}

export default function ListMenuEdit({
    menuItem,
    statusFilter,
    search,
    onToggleAvailable,
    onDisable,
    onEnable,
    onEdit,
    onLinkModifiers,
}: Props) {
    const keyword = search.trim().toLowerCase();
    const filterMenu = menuItem
        .filter((menu) => {
            if (statusFilter === 'available') return menu.is_active && menu.is_available;
            if (statusFilter === 'sold_out') return menu.is_active && !menu.is_available;
            if (statusFilter === 'inactive') return !menu.is_active;
            return true;
        })
        .filter(
            (menu) =>
                keyword === '' ||
                menu.name.toLowerCase().includes(keyword) ||
                (menu.description ?? '').toLowerCase().includes(keyword),
        )
        .sort((a, b) => Number(b.is_active) - Number(a.is_active));

    return (
        <div className="overflow-hidden rounded-2xl border border-[#e5d9c8] bg-white shadow-xs">
            <table className="w-full text-sm">
                <thead className="bg-[#f7f3ee] text-xs text-stone-500">
                    <tr>
                        <th className="px-5 py-3 text-left font-medium">เมนูอาหาร</th>
                        <th className="px-5 py-3 text-right font-medium">ราคา</th>
                        <th className="px-5 py-3 text-left font-medium">กลุ่มตัวเลือก</th>
                        <th className="px-5 py-3 text-left font-medium">สถานะวันนี้</th>
                        <th className="px-5 py-3 text-right font-medium">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {filterMenu.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-5 py-14 text-center text-stone-400">
                                ไม่พบรายการเมนูในเงื่อนไขที่เลือก
                            </td>
                        </tr>
                    )}
                    {filterMenu.map((m) => (
                        <tr
                            key={m.menu_item_id}
                            className={`border-t border-[#efe6da] transition-colors hover:bg-[#FAF7F2]/60 ${
                                m.is_active ? '' : 'bg-[#f5f0e8]/80 opacity-75'
                            }`}
                        >
                            {/* รูป Thumbnail + ชื่อเมนู + คำอธิบาย */}
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-3.5">
                                    <MenuThumbnail item={m} onClick={() => onEdit(m)} />
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-[#2D241E]">
                                                {m.name}
                                            </span>
                                            {!m.is_active && (
                                                <span className="rounded-full bg-[#e5d9c8] px-2 py-0.5 text-[11px] font-medium text-[#7a5c45]">
                                                    เลิกขาย
                                                </span>
                                            )}
                                        </div>
                                        {m.description ? (
                                            <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                                                {m.description}
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-[11px] text-stone-400">
                                                ไม่มีคำอธิบาย
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* ราคา */}
                            <td className="px-5 py-3 text-right font-semibold tabular-nums text-[#8C6D58]">
                                ฿{m.price.toLocaleString()}
                            </td>

                            {/* ตัวเลือก */}
                            <td className="px-5 py-3 text-stone-600">
                                <button
                                    type="button"
                                    onClick={() => onLinkModifiers(m)}
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                                        m.modifier_group_ids.length > 0
                                            ? 'border-[#d9c6b0] bg-[#FAF7F2] text-[#7a5c45] hover:bg-[#EFE8DC]'
                                            : 'border-dashed border-stone-300 text-stone-500 hover:border-[#8C6D58] hover:text-[#2D241E]'
                                    }`}
                                >
                                    <SlidersHorizontal size={12} aria-hidden="true" />
                                    {m.modifier_group_ids.length > 0
                                        ? `ตัวเลือก ${m.modifier_group_ids.length} กลุ่ม`
                                        : 'ผูกตัวเลือก'}
                                </button>
                            </td>

                            {/* สถานะวันนี้ */}
                            <td className="px-5 py-3">
                                {m.is_active ? (
                                    <label className="inline-flex cursor-pointer items-center gap-2.5">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={m.is_available}
                                            aria-label={`สลับสถานะพร้อมขายของ ${m.name}`}
                                            onClick={() => onToggleAvailable(m)}
                                            className={`relative h-6 w-11 cursor-pointer rounded-full transition-all duration-200 hover:shadow-xs ${
                                                m.is_available ? 'bg-[#5f7a52]' : 'bg-[#8a7a6c]'
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-all duration-200 ${
                                                    m.is_available ? 'left-5.5' : 'left-0.5'
                                                }`}
                                            />
                                        </button>
                                        <span
                                            className={`text-xs font-medium ${
                                                m.is_available ? 'text-[#3F6B35]' : 'text-amber-700'
                                            }`}
                                        >
                                            {m.is_available ? 'พร้อมขาย' : 'หมดวันนี้'}
                                        </span>
                                    </label>
                                ) : (
                                    <span className="text-xs text-stone-500">
                                        ไม่แสดงในหน้า POS
                                    </span>
                                )}
                            </td>

                            {/* จัดการ */}
                            <td className="px-5 py-3">
                                <div className="flex justify-end gap-1.5">
                                    {m.is_active ? (
                                        <>
                                            <button
                                                type="button"
                                                title="แก้ไขเมนู / รูปภาพ"
                                                aria-label={`แก้ไข ${m.name}`}
                                                onClick={() => onEdit(m)}
                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#d9c6b0] text-[#2D241E] transition-all duration-200 hover:bg-white hover:border-[#8C6D58] hover:text-[#8C6D58] hover:shadow-xs active:scale-95"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                title="เลิกขาย"
                                                aria-label={`เลิกขาย ${m.name}`}
                                                onClick={() => onDisable(m)}
                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#d9c6b0] text-[#2D241E] transition-all duration-200 hover:bg-white hover:border-red-300 hover:text-red-600 hover:shadow-xs active:scale-95"
                                            >
                                                <EyeOff size={15} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onEnable(m)}
                                            className="cursor-pointer rounded-xl border border-[#b08968]/70 bg-white px-3 py-1.5 text-xs font-medium text-[#2D241E] transition-all duration-200 hover:bg-[#FAF7F2] hover:shadow-xs active:scale-95"
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
    );
}
