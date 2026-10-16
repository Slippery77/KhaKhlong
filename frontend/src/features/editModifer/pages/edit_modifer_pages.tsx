import { useState } from 'react';
import Header from '../../../components/Header';
import SettingNavBar from '../../../components/settingNavBar';
import ModifierGroupEditor from '../components/ModifierGroupEditor';
import ModifierSidebar from '../components/ModifierSidebar';
import { useModifierAdmin } from '../hook/useModifierAdmin';
import type { ModifierGroup, ModifierGroupInput } from '../types/modifier.types';

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
    <div className="flex h-dvh flex-col font-kanit">
      <Header />
      <SettingNavBar />
      <div className="flex min-h-0 flex-1">
        <ModifierSidebar
          groups={groups}
          selectedId={selectedId}
          onSelect={selectGroup}
          onCreate={() => { setSelectedId(null); setIsCreating(true); }}
          onToggleActive={group => void setGroupActive(group.modifier_group_id, !group.is_active)}
        />
        {isLoading ? (
          <main className="flex flex-1 items-center justify-center bg-[#fbf8f4] text-sm text-stone-500">กำลังโหลดกลุ่มตัวเลือก...</main>
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
    </div>
  );
}
