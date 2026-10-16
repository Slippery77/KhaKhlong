import { EyeOff, Plus, Trash2 } from 'lucide-react';
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
    <aside className="flex h-full w-36 shrink-0 flex-col border-r border-[#d0b89e] bg-[#f4eadb]">
      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 pt-5">
        {groups.map(group => (
          <li key={group.modifier_group_id}>
            <div className={`flex items-center rounded-xl transition ${selectedId === group.modifier_group_id ? 'bg-[#d8c3ac] text-[#503e30]' : 'text-stone-600 hover:bg-[#eadbc9]'} ${group.is_active ? '' : 'opacity-45'}`}>
              <button type="button" onClick={() => onSelect(group)} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-xs">
                {group.name}
              </button>
              <button type="button" onClick={() => onToggleActive(group)} title={group.is_active ? 'ปิดใช้งานกลุ่ม' : 'เปิดใช้งานกลุ่ม'} className="mr-1 rounded-lg p-1.5 hover:bg-white/40">
                {group.is_active ? <Trash2 size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-[#d0b89e] p-2">
        <button type="button" onClick={onCreate} className="flex w-full items-center justify-center gap-1 rounded-full border border-[#b78e70] bg-[#fffaf2] py-2 text-xs font-semibold text-[#4d3829] hover:bg-white">
          <Plus size={14} /> เพิ่มกลุ่ม
        </button>
      </div>
    </aside>
  );
}
