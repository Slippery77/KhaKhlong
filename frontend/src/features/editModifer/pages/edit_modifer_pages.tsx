import { useState } from 'react';
import { Plus } from 'lucide-react';
import ModifierGroupEditor from '../components/ModifierGroupEditor';
import ModifierSidebar from '../components/ModifierSidebar';
import { useModifierAdmin } from '../hook/useModifierAdmin';
import type { ModifierGroup, ModifierGroupInput } from '../types/modifier.types';

function ModifierEditorSkeleton() {
  return (
    <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse font-kanit" aria-busy="true">
      <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-4">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded bg-stone-200/70" />
          <div className="h-4 w-60 rounded bg-stone-200/40" />
        </div>
        <div className="h-9 w-24 rounded-xl bg-stone-200/60" />
      </div>
      <div className="space-y-4 max-w-xl">
        <div className="h-4 w-28 rounded bg-stone-200/60" />
        <div className="h-10 w-full rounded-xl bg-stone-200/40" />
        <div className="h-4 w-32 rounded bg-stone-200/60" />
        <div className="h-10 w-full rounded-xl bg-stone-200/40" />
      </div>
    </main>
  );
}

export default function EditModiferPage() {
  const {
    groups, isLoading, isSubmitting, error,
    createGroup, updateGroup, setGroupActive, createModifier, updateModifier, setModifierActive,
  } = useModifierAdmin();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selected = groups.find(group => group.modifier_group_id === selectedId) ?? (isCreating ? undefined : groups[0]);
  const showEditor = isCreating || Boolean(selected);

  const selectGroup = (group: ModifierGroup) => {
    setSelectedId(group.modifier_group_id);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedId(null);
    setIsCreating(true);
  };

  const saveGroup = async (input: ModifierGroupInput) => {
    if (selected) {
      await updateGroup(selected.modifier_group_id, input);
      return;
    }
    const created = await createGroup(input);
    if (created) {
      setSelectedId(created.modifier_group_id);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 font-kanit">
      {/* ── Desktop View: Sidebar ด้านซ้ายคงเดิม 100% ── */}
      <ModifierSidebar
        groups={groups}
        selectedId={selected?.modifier_group_id ?? null}
        onSelect={selectGroup}
        onCreate={handleStartCreate}
        onToggleActive={group => void setGroupActive(group.modifier_group_id, !group.is_active)}
        isLoading={isLoading}
      />

      {/* ── ส่วนเนื้อหาหลัก / Editor ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* แถบเลือกกลุ่มตัวเลือกบน Mobile (Sticky Top Bar - แถวเดียว สบายตา) */}
        {groups.length > 0 && (
          <div className="md:hidden px-4 py-2.5 bg-white border-b border-[#E8DFD5] shrink-0 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {groups.map((group) => {
                const isSelected = selected?.modifier_group_id === group.modifier_group_id && !isCreating;
                return (
                  <button
                    key={group.modifier_group_id}
                    type="button"
                    onClick={() => selectGroup(group)}
                    className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#8C6D58] text-white shadow-2xs font-semibold'
                        : 'bg-[#FAF7F2] text-stone-700 border border-[#d9c6b0]/70 hover:border-[#8C6D58]'
                    } ${group.is_active ? '' : 'opacity-60'}`}
                  >
                    <span className="truncate max-w-[130px]">{group.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#e5d9c8]/70 text-[#7a5c45]'
                      }`}
                    >
                      {group.modifiers.length}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleStartCreate}
                className={`inline-flex shrink-0 items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed cursor-pointer transition-all ${
                  isCreating
                    ? 'bg-[#8C6D58] text-white border-[#8C6D58] shadow-2xs font-semibold'
                    : 'border-[#8C6D58] text-[#8C6D58] bg-white hover:bg-[#FAF7F2]'
                }`}
              >
                <Plus size={13} />
                <span>เพิ่มกลุ่ม</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading && groups.length === 0 ? (
            <ModifierEditorSkeleton />
          ) : showEditor ? (
            <ModifierGroupEditor
              key={selected?.modifier_group_id ?? 'new'}
              group={selected}
              busy={isSubmitting}
              error={error}
              onSaveGroup={saveGroup}
              onCreateModifier={async (name, price) => { if (selected) await createModifier(selected.modifier_group_id, name, price); }}
              onUpdateModifier={async (item, name, price) => { await updateModifier(item.modifier_id, name, price); }}
              onToggleModifier={async (item, active) => { await setModifierActive(item.modifier_id, active); }}
            />
          ) : (
            <main className="flex flex-1 items-center justify-center bg-[#fbf8f4] p-6">
              <div className="text-center">
                <p className="text-sm text-stone-500">เลือกกลุ่มตัวเลือก หรือเริ่มสร้างกลุ่มใหม่</p>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8C6D58] text-white text-xs font-medium hover:bg-[#7a5c45] transition cursor-pointer"
                >
                  <Plus size={14} /> สร้างกลุ่มตัวเลือกใหม่
                </button>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
