import { EyeOff, Plus } from 'lucide-react';
import type { ModifierGroup } from '../types/modifier.types';

interface Props {
  groups: ModifierGroup[];
  selectedId: string | null;
  onSelect: (group: ModifierGroup) => void;
  onCreate: () => void;
  onToggleActive: (group: ModifierGroup) => void;
}

export default function ModifierSidebar({ groups, selectedId, onSelect, onCreate, onToggleActive }: Props) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-[#E8DFD5] bg-[#FBF9F6]">
      <div className="border-b border-[#E8DFD5] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-[#2D241E]">กลุ่มตัวเลือกเสริม</h2>
            <p className="mt-0.5 text-xs text-stone-500">{groups.length} กลุ่ม</p>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8C6D58] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#7a5c45] cursor-pointer"
          >
            <Plus size={14} /> เพิ่มกลุ่ม
          </button>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-stone-500">ยังไม่มีกลุ่มตัวเลือก</li>
        ) : (
          groups.map((group) => {
            const isSelected = selectedId === group.modifier_group_id;
            return (
              <li key={group.modifier_group_id}>
                <div
                  className={`group flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
                    isSelected
                      ? 'border-[#8C6D58]/40 bg-white shadow-sm'
                      : 'border-transparent hover:bg-white/70'
                  } ${group.is_active ? '' : 'opacity-60'}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(group)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <p className="truncate text-sm text-[#2D241E]">{group.name}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {group.selection_type === 'single' ? 'เลือกได้ 1 ตัวเลือก' : 'เลือกได้หลายตัวเลือก'}
                      {group.is_required ? ' • บังคับเลือก' : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(group)}
                    title={group.is_active ? 'ปิดใช้งานกลุ่ม' : 'เปิดใช้งานกลุ่ม'}
                    className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-[#f6f1ec] hover:text-[#8C6D58] cursor-pointer"
                  >
                    <EyeOff size={15} />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
