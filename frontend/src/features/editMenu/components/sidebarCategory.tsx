import { Plus, EllipsisVertical, FolderOpen, ChevronUp, ChevronDown } from 'lucide-react';
import type { Category } from '../types/menu.types';
import { useState, useRef, useEffect } from 'react';
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
    isLoading?: boolean;
    onReorder?: (newCategories: Category[]) => Promise<boolean>;
}

export default function SidebarCategory({
    categories,
    selectedId,
    onSelect,
    onAdd,
    isSubmitting,
    error,
    onRenameCategory,
    onToggleCategory,
    editIsSubmitting,
    editError,
    isLoading = false,
    onReorder,
}: Props) {
    const [ showPopup, setShowPopup ] = useState(false);
    const [ showEdit, setShowEdit ] = useState(false);
    const [ isReordering, setIsReordering ] = useState(false);
    const [ reorderError, setReorderError ] = useState<string | null>(null);
    const isReorderingRef = useRef(false);
    const errorTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (errorTimerRef.current) {
                window.clearTimeout(errorTimerRef.current);
            }
        };
    }, []);

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (!onReorder || isReorderingRef.current) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= categories.length) return;

        const newCategories = [...categories];
        const [moved] = newCategories.splice(index, 1);
        newCategories.splice(targetIndex, 0, moved);

        // Update in-memory sort_order values to match new positions (Finding 2)
        const updatedCategories = newCategories.map((cat, idx) => ({
            ...cat,
            sort_order: idx + 1,
        }));

        isReorderingRef.current = true;
        setIsReordering(true);
        setReorderError(null);
        if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);

        try {
            const success = await onReorder(updatedCategories);
            if (!success) {
                setReorderError('สลับลำดับหมวดหมู่ไม่สำเร็จ');
                errorTimerRef.current = window.setTimeout(() => setReorderError(null), 4000);
            }
        } catch {
            setReorderError('เกิดข้อผิดพลาดในการจัดลำดับ');
            errorTimerRef.current = window.setTimeout(() => setReorderError(null), 4000);
        } finally {
            isReorderingRef.current = false;
            setIsReordering(false);
        }
    };
    const selectedCategory = categories.find(c => c.category_id === selectedId);

    const isInitialLoading = isLoading && categories.length === 0;

    return (
          <aside className="flex h-full w-64 flex-col border-r border-[#d9c6b0] bg-[#f7f3ee]">
              <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[#e5d9c8] text-[#8C6D58]">
                          <FolderOpen size={18} />
                      </div>
                      <div>
                          <p className="text-sm font-semibold text-[#2D241E]">หมวดหมู่</p>
                          <p className="text-xs text-stone-500">
                              {isInitialLoading ? 'กำลังโหลด...' : `${categories.length} หมวดหมู่`}
                          </p>
                      </div>
                  </div>
              </div>
              <div className="mx-3 h-px bg-[#e5d9c8]" />
              {reorderError && (
                  <div className="mx-3 mt-2 rounded-xl bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 flex items-center justify-between">
                      <span>{reorderError}</span>
                      <button type="button" onClick={() => setReorderError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer">✕</button>
                  </div>
              )}
              <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2" aria-busy={isInitialLoading}>
                  {isInitialLoading ? (
                      <div className="flex flex-col gap-2 p-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i} className="h-10 rounded-xl bg-stone-200/60 animate-pulse" />
                          ))}
                      </div>
                  ) : (
                      <>
                          {categories.length === 0 && (
                              <li className="px-2 py-6 text-center text-xs text-stone-400">
                                  ยังไม่มีหมวดหมู่
                              </li>
                          )}
                          {categories.map((c, index) => {
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
                                              className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left cursor-pointer"
                                          >
                                              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                                              <span
                                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                                                      isSelected
                                                          ? 'bg-white/20 text-white'
                                                          : 'bg-[#f0e6dc] text-[#8C6D58]'
                                                  }`}
                                              >
                                                  {itemCount}
                                              </span>
                                          </button>

                                          {/* ปุ่มเลื่อนลำดับ ขึ้น / ลง (ออกแบบตาม ui-ux-pro-max) */}
                                          {onReorder && categories.length > 1 && (
                                              <div className="flex flex-col -space-y-0.5 shrink-0 px-0.5">
                                                  <button
                                                      type="button"
                                                      disabled={isReordering}
                                                      aria-disabled={index === 0}
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          if (index === 0) return;
                                                          handleMove(index, 'up');
                                                      }}
                                                      title={index === 0 ? 'อยู่อันดับแรกแล้ว' : `เลื่อน "${c.name}" ขึ้น`}
                                                      aria-label={`เลื่อนหมวดหมู่ ${c.name} ขึ้น`}
                                                      className={`p-0.5 rounded transition-all active:scale-85 cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                                                          index === 0 ? 'opacity-20 cursor-not-allowed' : ''
                                                      } ${
                                                          isSelected
                                                              ? 'text-white/80 hover:bg-white/20 hover:text-white'
                                                              : 'text-stone-400 hover:bg-[#f0e6dc] hover:text-[#2D241E]'
                                                      }`}
                                                  >
                                                      <ChevronUp size={13} strokeWidth={2.5} />
                                                  </button>
                                                  <button
                                                      type="button"
                                                      disabled={isReordering}
                                                      aria-disabled={index === categories.length - 1}
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          if (index === categories.length - 1) return;
                                                          handleMove(index, 'down');
                                                      }}
                                                      title={index === categories.length - 1 ? 'อยู่อันดับสุดท้ายแล้ว' : `เลื่อน "${c.name}" ลง`}
                                                      aria-label={`เลื่อนหมวดหมู่ ${c.name} ลง`}
                                                      className={`p-0.5 rounded transition-all active:scale-85 cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                                                          index === categories.length - 1 ? 'opacity-20 cursor-not-allowed' : ''
                                                      } ${
                                                          isSelected
                                                              ? 'text-white/80 hover:bg-white/20 hover:text-white'
                                                              : 'text-stone-400 hover:bg-[#f0e6dc] hover:text-[#2D241E]'
                                                      }`}
                                                  >
                                                      <ChevronDown size={13} strokeWidth={2.5} />
                                                  </button>
                                              </div>
                                          )}

                                          {/* ปุ่ม ⋮ ชิดขวาสุด */}
                                          <button
                                              type="button"
                                              title="แก้ไขหมวด"
                                              onClick={() => {
                                                  onSelect(c.category_id);
                                                  setShowEdit(true);
                                              }}
                                              className={`mr-1 shrink-0 rounded-lg p-1.5 transition-all active:scale-90 cursor-pointer ${
                                                  isSelected
                                                      ? 'text-white/80 hover:bg-white/15 hover:text-white'
                                                      : 'text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-[#f0e6dc] hover:text-[#2D241E]'
                                              }`}
                                          >
                                              <EllipsisVertical size={16} />
                                          </button>
                                      </div>
                                  </li>
                              );
                          })}
                      </>
                  )}
              </ul>
              
              <div className="shrink-0 border-t border-[#e5d9c8] p-2.5">
                  <button
                      type="button"
                      disabled={isInitialLoading}
                      onClick={() => setShowPopup(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-medium text-[#2D241E] shadow-sm ring-1 ring-inset ring-[#d9c6b0] transition-all duration-200 hover:bg-[#FAF7F2] hover:shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <Plus size={16} /> เพิ่มหมวดหมู่
                  </button>
              </div>

              {showPopup && (
                  <CreateCategoryPopUp
                      onAdd={onAdd}
                      onClose={() => setShowPopup(false)}
                      isSubmitting={isSubmitting}
                      error={error}
                  />
              )}
              {showEdit && selectedCategory && (
                  <EditCategoryPopup
                      category={selectedCategory}
                      onRename={(name) => onRenameCategory(selectedCategory.category_id, name)}
                      onToggleActive={() => onToggleCategory(selectedCategory)}
                      onClose={() => setShowEdit(false)}
                      isSubmitting={editIsSubmitting}
                      error={editError}
                  />
              )}
          </aside>
    );
}
