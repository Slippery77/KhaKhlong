import { useState } from 'react';
import type { MenuItem } from '../types/menu.types';

// ค่าที่ฟอร์มส่งออกไปให้หน้า page
export interface MenuFormValues{
    name: string;
    description: string | null;   // ช่องว่าง = null
    price: number;
}

interface Props{
    item?: MenuItem;                                       // มี = โหมดแก้ไข, ไม่มี = โหมดเพิ่ม
    onSubmit: (values: MenuFormValues) => Promise<boolean>; // true = สำเร็จ → ปิด popup
    onClose: () => void;
    isSubmitting: boolean;
    error: string | null;
}

export default function MenuFormPopup({item, onSubmit, onClose, isSubmitting, error}:Props){
    const isEdit = item !== undefined;
    // ใส่ค่าเดิมไว้ตอนแก้ไข ราคาเก็บเป็น string เพราะ input คืนค่าเป็น string
    const [name, setName] = useState(item?.name ?? '');
    const [description, setDescription] = useState(item?.description ?? '');
    const [price, setPrice] = useState(item ? String(item.price) : '');

    const priceNumber = Number(price);
    const isPriceValid = price.trim() !== '' && !Number.isNaN(priceNumber) && priceNumber >= 0;
    const canSubmit = name.trim() !== '' && isPriceValid && !isSubmitting;

    const handleSubmit = async (e: React.SubmitEvent)=>{
        e.preventDefault();
        const ok = await onSubmit({
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
            price: priceNumber,
        });
        if(ok){
            onClose();
        }
    };

    return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2D241E]">
            {isEdit ? 'แก้ไขเมนู' : 'เพิ่มเมนู'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-stone-600">
            ชื่อเมนู <span className="text-red-500">*</span>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={150}
              placeholder="เช่น ข้าวผัดหมู"
              className="rounded-xl border border-[#d9c6b0]/80 px-3 py-2.5 text-[#2D241E] shadow-sm outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-stone-600">
            คำอธิบาย (ไม่บังคับ)
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="เช่น ไข่ดาว แตงกวา พริกน้ำปลา"
              className="resize-none rounded-xl border border-[#d9c6b0]/80 px-3 py-2.5 text-[#2D241E] shadow-sm outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-stone-600">
            ราคา (บาท) <span className="text-red-500">*</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              className="rounded-xl border border-[#d9c6b0]/80 px-3 py-2.5 text-[#2D241E] shadow-sm outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="mt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl py-2.5 border border-[#d9c6b0] text-[#2D241E] transition-all duration-200 enabled:hover:bg-[#FAF7F2] enabled:active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl py-2.5 font-semibold bg-[#8C6D58] text-white shadow-sm transition-all duration-200 enabled:hover:bg-[#7a5c45] enabled:hover:shadow-md enabled:active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
    )
}

// TODO วิธีต่อใน menu_edit.tsx (ส่วนของคุณ)
// 1) state: const [formItem, setFormItem] = useState<MenuItem | undefined>();
//          const [showForm, setShowForm] = useState(false);
//    - ปุ่ม "+ เพิ่มเมนู"  → setFormItem(undefined); setShowForm(true)
//    - handleEdit(item)    → setFormItem(item);      setShowForm(true)
//
// 2) render: {showForm && <MenuFormPopup item={formItem} onSubmit={...} onClose={() => setShowForm(false)} isSubmitting={...} error={...} />}
//
// 3) onSubmit(values):
//    - โหมดเพิ่ม (formItem ไม่มี) → createMenuItem(selected.category_id, values.name, values.description, values.price)
//    - โหมดแก้ไข               → เทียบ values กับ formItem ส่งเฉพาะช่องที่เปลี่ยน (ช่องที่ไม่เปลี่ยนส่ง undefined)
//                                 editMenuItem(formItem.menu_item_id, name?, description?, price?)
//    - สำเร็จ → await reload() แล้ว return true (popup ปิดเอง) / ไม่สำเร็จ → return false
//    - isSubmitting / error ส่งของ hook ที่ใช้อยู่ตามโหมด
