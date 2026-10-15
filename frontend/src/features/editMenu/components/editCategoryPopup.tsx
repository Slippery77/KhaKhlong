import type { Category } from '../types/menu.types';
import { useState } from 'react';

// =====================================================================
// popup แก้ไขหมวด: เปลี่ยนชื่อ + ปิด/เปิดหมวด
// ดูหน้าตาและโครง form จาก createCategoryPopup.tsx ได้เลย
// =====================================================================

// ภาพรวม flow
//   sidebar มีปุ่มดินสอข้างชื่อหมวด → กดแล้วเปิด popup นี้ (ส่ง category ที่กดเข้ามา)
//   ใน popup: ช่องชื่อ + ปุ่มบันทึกชื่อ + ปุ่มปิด/เปิดหมวด + ปุ่มยกเลิก
//   ทำสำเร็จ → หน้า page reload() → ปิด popup
//
// หมายเหตุ backend
//   - GET /menu/admin ส่งหมวดที่ปิดแล้วมาด้วย (category.is_active = false)
//   - ปิดหมวดแล้ว เมนูในหมวดนั้นจะไม่แสดงในหน้า POS
//   - hook ใช้ useEditCategory() ที่ทำไว้แล้ว: editCategoryName, disable, enable

interface Props{
    category: Category;                                   // หมวดที่กำลังแก้
    onRename: (name: string) => Promise<boolean>;         // true = สำเร็จ
    onToggleActive: () => Promise<boolean>;               // ปิดถ้าเปิดอยู่ / เปิดถ้าปิดอยู่
    onClose: () => void;
    isSubmitting: boolean;
    error: string | null;
}

export default function EditCategoryPopup({category, onRename, onToggleActive, onClose, isSubmitting, error}:Props){
    //   - useState เริ่มต้นด้วย category.name (ใส่ค่าเดิมไว้ให้)
    const [name,setName] = useState(category.name);
    //  handleSubmit (submit ฟอร์มเปลี่ยนชื่อ)
    //   - e.preventDefault()
    //   - ถ้าชื่อ trim แล้วเหมือนเดิม → onClose() เลย ไม่ต้องเรียก API
    //   - await onRename(name.trim()) → true ให้ onClose()
    const handleSubmit = async (e : React.SubmitEvent) => {
        const trimmed = name.trim();
        e.preventDefault();

        if(trimmed === category.name ){
            onClose();
            return;
        }
        const ok = await onRename(trimmed);
        if(ok){
            onClose();
        }
    }
    //  handleToggleActive (ปุ่มปิด/เปิดหมวด)
    //   - (ไม่บังคับ) ตอนจะปิด ถามยืนยันก่อน เช่น window.confirm('ปิดหมวดนี้? เมนูในหมวดจะไม่แสดงตอนสั่งอาหาร')
    //   - await onToggleActive() → true ให้ onClose()
    const handleToggleActive = async () =>{

        if(category.is_active && !window.confirm('ปิดหมวดนี้? เมนูในหมวดจะไม่แสดงตอนสั่งอาหาร'))
            return;
        const toggle = await onToggleActive()
        if(toggle){
            onClose()   ;
        }
    }
    
    //   - พื้นหลังมืด + การ์ดขาวกลางจอ (copy จาก createCategoryPopup.tsx)
    //   - หัวข้อ "แก้ไขหมวด"
    //   - <form onSubmit={handleSubmit}>
    //       input ชื่อ (maxLength 100, autoFocus)
    //       error (ถ้ามี) สีแดง
    //       ปุ่ม "บันทึก" type="submit" disabled ถ้า isSubmitting หรือชื่อว่าง
    //       ปุ่ม "ยกเลิก" type="button" onClick={onClose}
    //   - เส้นคั่น แล้วปุ่ม type="button" onClick={handleToggleActive}
    //       category.is_active ? 'ปิดหมวดนี้' (สีแดง) : 'เปิดหมวดอีกครั้ง'

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
            <div className='w-80 rounded-2xl bg-white p-4 shadow-lg'>
                <h2 className='mb-3 text-lg font-semibold'>แก้ไขหมวด</h2>
                <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
                    <input 
                        autoFocus
                        value={name}
                        onChange={e=> setName(e.target.value)}
                        placeholder='ชื่อหมวดหมู่'    
                        maxLength={100}
                        className='rounded border px-2 py-1'
                    />
                    {error && <p className='text-xs text-red-600'>{error}</p>}
                    <hr className='border-[#b08968]'/>
                    <h2 className='mb-3 text-lg font-semibold'>เปิด/ปิดหมวด</h2>
                    <button 
                        type='button'
                        role='switch'
                        aria-checked={category.is_active}
                        onClick={()=> handleToggleActive()}
                        className={`relative h-6 w-11 rounded-full transition enabled:hover:opacity-90 disabled:opacity-50 ${
                                category.is_active ? 'bg-[#5f7a52]' : 'bg-[#8a7a6c]'
                            }`}
                        disabled={isSubmitting}
                        >
                        <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                category.is_active ? 'left-5.5' : 'left-0.5'
                                }`}
                            />
                    </button>
                    <span className="text-[#2D241E]">{category.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                    <div className='flex gap-2'>
                        <button
                            type='submit'
                            disabled={isSubmitting || name.trim() === ''}
                            className='flex-1 rounded-xl py-1 bg-[#8C6D58] text-white transition enabled:hover:bg-[#7a5c45] enabled:active:scale-95 disabled:opacity-50'
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                        <button
                            type='button'
                            onClick={onClose}
                            disabled={isSubmitting}
                            className='flex-1 rounded-xl py-1 border border-[#d9c6b0] text-[#2D241E] transition enabled:hover:bg-[#FAF7F2] enabled:active:scale-95 disabled:opacity-50'
                            >
                                ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}