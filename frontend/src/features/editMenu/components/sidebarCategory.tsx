import { Plus, EllipsisVertical, FolderOpen } from 'lucide-react';
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
          <aside className="flex h-full w-64 flex-col border-r border-[#d9c6b0] bg-[#f7f3ee]">
              <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[#e5d9c8] text-[#8C6D58]">
                          <FolderOpen size={18} />
                      </div>
                      <div>
                          <p className="text-sm font-semibold text-[#2D241E]">หมวดหมู่</p>
                          <p className="text-xs text-stone-500">{categories.length} หมวดหมู่</p>
                      </div>
                  </div>
              </div>
              <div className="mx-3 h-px bg-[#e5d9c8]" />
              <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
                  {categories.length === 0 && (
                      <li className="px-2 py-6 text-center text-xs text-stone-400">
                          ยังไม่มีหมวดหมู่
                      </li>
                  )}
                  {categories.map(c => {
                      const itemCount = c.items?.length ?? 0;
                      const isSelected = c.category_id === selectedId;
                      return (
                  <li key={c.category_id}>
                       <div
                          className={`group flex items-center rounded-xl border transition-all duration-200 ${
                            isSelected
                              ? 'border-[#8C6D58] bg-[#8C6D58] text-white shadow-sm'
                              : 'border-transparent bg-transparent text-[#2D241E] hover:border-[#e5d9c8] hover:bg-white hover:shadow-sm'
                          } ${c.is_active ? '' : 'opacity-60'}`}
                        >
                          {/* ปุ่มเลือกหมวด กินพื้นที่ที่เหลือทั้งหมด */}
                          <button
                            type="button"
                            onClick={() => onSelect(c.category_id)}
                            className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${isSelected ? 'bg-white/20 text-white' : 'bg-[#f0e6dc] text-[#8C6D58]'}`}>
                                {itemCount}
                            </span>
                          </button>

                          {/* ปุ่ม ⋮ ชิดขวาสุด */}
                          <button
                            type="button"
                            title="แก้ไขหมวด"
                            onClick={() => { onSelect(c.category_id); setShowEdit(true);}}
                            className={`mr-1 shrink-0 rounded-lg p-1.5 transition-all active:scale-90 cursor-pointer ${
                                  isSelected ? 'text-white/80 hover:bg-white/15 hover:text-white' : 'text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-[#f0e6dc] hover:text-[#2D241E]'
                            }`}
                          >
                            <EllipsisVertical size={16} />
                          </button>
                        </div>
                  </li>
                      );
                  })}
              </ul>
              
          <div className="shrink-0 border-t border-[#e5d9c8] p-2.5">
          <button
            onClick={() => setShowPopup(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-medium text-[#2D241E] shadow-sm ring-1 ring-inset ring-[#d9c6b0] transition-all duration-200 hover:bg-[#FAF7F2] hover:shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} /> เพิ่มหมวดหมู่
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