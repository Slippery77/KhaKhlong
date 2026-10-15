import { useState } from 'react';

interface Props{
    onAdd:(name:string)=>Promise<boolean>;
    onClose:()=>void;
    isSubmitting:boolean;
    error:string|null;
}

export default function CreateCategoryPopUp({onAdd,onClose,isSubmitting,error}:Props){
    const [name, setName] = useState('');
    const handleSubmit = async (e: React.SubmitEvent)=>{
        e.preventDefault();
        const ok = await onAdd(name.trim());
        if(ok){
            onClose()    
        }
    }
    
    return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      {/* ชั้นใน = การ์ดขาวกลางจอ */}
      <div className="w-80 rounded-2xl bg-white p-4 shadow-lg">
        <h2 className="mb-3 text-lg font-semibold">เพิ่มหมวดหมู่</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ชื่อหมวดหมู่"
            className="rounded border px-2 py-1"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || name.trim() === ''}
              className="flex-1 rounded-xl py-1 bg-[#8C6D58] text-white transition enabled:hover:bg-[#7a5c45] enabled:active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl py-1 border border-[#d9c6b0] text-[#2D241E] transition enabled:hover:bg-[#FAF7F2] enabled:active:scale-95 disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
    )
}