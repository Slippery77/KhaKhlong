import {Plus, EllipsisVertical} from 'lucide-react';
import type { Category } from '../types/menu.types';
import { useState } from 'react';
import CreateCategoryPopUp from './createCategoryPopup';
import EditCategoryPopup from './editCategoryPopup';

interface Props {
    categories: Category[];
    selectedId: string|null;
    onSelect:(id:string)=>void;
    onAdd:(name:string)=>Promise<boolean>;
    isSubmitting:boolean;
    error:string|null;
    onRenameCategory: (categoryId: string, name:string) => Promise<boolean>;
    onToggleCategory: (category:Category) => Promise<boolean>;
    editIsSubmitting: boolean;
    editError: string|null;
};

export default function SidebarCategory({categories, selectedId, onSelect, onAdd, isSubmitting, error, onRenameCategory, onToggleCategory, editIsSubmitting ,editError}:Props){
    const [ showPopup, setShowPopup ] = useState(false);
    const [ showEdit, setShowEdit ] = useState(false);
    const selectedCategory = categories.find(c => c.category_id === selectedId);

    return (
          <aside className="flex h-full w-40 flex-col border-r border-[#d9c6b0] bg-[#f3eadf]">
              <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {categories.map(c => (
                  <li key={c.category_id}>
                       <div
                          className={`flex items-center rounded-xl border transition-colors ${
                            c.category_id === selectedId
                              ? 'border-[#8C6D58] bg-[#8C6D58] font-semibold text-white'
                              : 'border-[#b08968] bg-[#FAF7F2] text-[#2D241E] hover:bg-white'
                          } ${c.is_active ? '' : 'opacity-50'}`}      // หมวดที่ปิดอยู่ แสดงจาง
                        >
                          {/* ปุ่มเลือกหมวด กินพื้นที่ที่เหลือทั้งหมด */}
                          <button
                            type="button"
                            onClick={() => onSelect(c.category_id)}
                            className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm transition active:opacity-70"
                          >
                            {c.name}
                          </button>

                          {/* ปุ่ม ⋮ ชิดขวาสุด */}
                          <button
                            type="button"
                            title="แก้ไขหมวด"
                            onClick={() => { onSelect(c.category_id); setShowEdit(true);}}
                            className={`shrink-0 rounded-lg p-1.5 transition active:scale-90 ${
                                  c.category_id === selectedId ? 'hover:bg-white/20' : 'hover:bg-black/10'
                            }`}
                          >
                            <EllipsisVertical size={16} />
                          </button>
                        </div>
                  </li>
                  ))}
              </ul>
              
          <div className="shrink-0 border-t-2 border-[#b08968] p-2">
          <button
            onClick={() => setShowPopup(true)}
            className="flex w-full items-center justify-center gap-1 rounded-2xl border border-[#b08968] py-1.5 text-sm transition hover:bg-white active:scale-95"
          >
            <Plus size={16} /> เพิ่มหมวด
          </button>
        </div>

        {showPopup && (
          <CreateCategoryPopUp
            onAdd={onAdd}
            onClose={()=>setShowPopup(false)}
            isSubmitting={isSubmitting}
            error={error}
          />
        )}
        {showEdit && selectedCategory && (<EditCategoryPopup category={selectedCategory} onRename={(name)=> onRenameCategory(selectedCategory.category_id, name)} onToggleActive={() => onToggleCategory(selectedCategory)} onClose={()=>setShowEdit(false)} isSubmitting={editIsSubmitting} error={editError}/>)}

      </aside>
  );
}