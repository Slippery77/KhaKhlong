import { useState } from 'react';
import ModifierGroupEditor from '../components/ModifierGroupEditor';
import ModifierSidebar from '../components/ModifierSidebar';
import { useModifierAdmin } from '../hook/useModifierAdmin';
import type { ModifierGroup, ModifierGroupInput } from '../types/modifier.types';

function ModifierEditorSkeleton() {
  return (
    <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6 lg:p-8 space-y-6 animate-pulse font-kanit" aria-busy="true">
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
  const selected = groups.find(group => group.modifier_group_id === selectedId);
  const showEditor = isCreating || Boolean(selected);

  const selectGroup = (group: ModifierGroup) => {
    setSelectedId(group.modifier_group_id);
    setIsCreating(false);
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
        <ModifierSidebar
          groups={groups}
          selectedId={selectedId}
          onSelect={selectGroup}
          onCreate={() => { setSelectedId(null); setIsCreating(true); }}
          onToggleActive={group => void setGroupActive(group.modifier_group_id, !group.is_active)}
          isLoading={isLoading}
        />
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
            <div className="text-center"><p className="text-sm text-stone-500">เลือกกลุ่มจากด้านซ้าย หรือเริ่มสร้างกลุ่มตัวเลือกใหม่</p></div>
          </main>
        )}
      </div>
  );
}
