import { useState } from 'react';
import type { MenuItem } from '../types/menu.types';
import type { ModifierGroup } from '../../editModifer/types/modifier.types';

interface Props{
    item:MenuItem;
    modifierGroups:ModifierGroup[];
    onSubmit:(modifierGroupIds:string[]) => Promise<boolean>; // true = สำเร็จ → ปิด popup
    onClose: () => void;
    isSubmitting:boolean;
    error:string|null;
    
}

export default function LinkModifierPopup({item,modifierGroups,onSubmit,onClose,isSubmitting,error}:Props){
    // ค่าเริ่มต้น = กลุ่มที่ผูกอยู่แล้ว
    const [selectedIds, setSelectedIds] = useState<string[]>(item.modifier_group_ids);
    
    // แสดงกลุ่มที่เปิดใช้งาน + กลุ่มที่ปิดไปแล้วแต่ยังผูกอยู่ (ให้ติ๊กออกได้)
    const activeGroups = modifierGroups.filter(
        g => g.is_active || item.modifier_group_ids.includes(g.modifier_group_id),
    );

    const toggle = (id: string) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        const ok = await onSubmit(selectedIds);
        if (ok) onClose();
    };

    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold text-[#2D241E]">กลุ่มตัวเลือกของ {item.name}</h2>
                <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {/* วน activeGroups: checkbox checked={selectedIds.includes(g.modifier_group_id)} onChange={() => toggle(g.modifier_group_id)} */}
                    {activeGroups.map(g => (
                        <li key={g.modifier_group_id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-[#FAF7F2]">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(g.modifier_group_id)}
                                    onChange={() => toggle(g.modifier_group_id)}
                                    className="h-4 w-4 accent-[#8C6D58]"
                                />
                                <span className="text-[#2D241E]">{g.name}</span>
                                {!g.is_active && (
                                    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600">
                                        ปิดใช้งาน
                                    </span>
                                )}
                            </label>
                        </li>
                    ))}
                </ul>

                {error && <p className="text-xs text-red-600">{error}</p>}
                {/* ปุ่มยกเลิก (onClose) + ปุ่มบันทึก type="submit" disabled={isSubmitting} */}
                <div className="mt-4 flex gap-2">
                    <button type="button" onClick={onClose} disabled={isSubmitting}
                        className="flex-1 cursor-pointer rounded-xl border border-[#d9c6b0] py-2 text-[#2D241E] transition enabled:hover:bg-[#FAF7F2] disabled:opacity-50">
                        ยกเลิก
                    </button>
                    <button type="submit" disabled={isSubmitting}
                        className="flex-1 cursor-pointer rounded-xl bg-[#8C6D58] py-2 font-semibold text-white transition enabled:hover:bg-[#7a5c45] disabled:opacity-50">
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </form>
        </div>
    );
}
