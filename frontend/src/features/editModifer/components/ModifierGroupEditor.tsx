import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ModifierGroup, ModifierGroupInput, SelectionType } from '../types/modifier.types';
import ModifierOptionRow from './ModifierOptionRow';

const emptyDraft: ModifierGroupInput = { name: '', selection_type: 'single', is_required: false };

interface Props {
  group?: ModifierGroup;
  busy: boolean;
  error: string | null;
  onSaveGroup: (input: ModifierGroupInput) => Promise<void>;
  onCreateModifier: (name: string, price: number) => Promise<void>;
  onUpdateModifier: (item: ModifierGroup['modifiers'][number], name: string, price: number) => Promise<void>;
  onToggleModifier: (item: ModifierGroup['modifiers'][number], active: boolean) => Promise<void>;
}

export default function ModifierGroupEditor({ group, busy, error, onSaveGroup, onCreateModifier, onUpdateModifier, onToggleModifier }: Props) {
  const [draft, setDraft] = useState<ModifierGroupInput>(emptyDraft);
  const [optionName, setOptionName] = useState('');
  const [optionPrice, setOptionPrice] = useState('0');
  const isDisabled = busy || Boolean(group && !group.is_active);

  useEffect(() => {
    setDraft(group ? { name: group.name, selection_type: group.selection_type, is_required: group.is_required } : emptyDraft);
    setOptionName('');
    setOptionPrice('0');
  }, [group]);

  const submitOption = async () => {
    const price = Number(optionPrice);
    if (!optionName.trim() || !Number.isFinite(price) || price < 0) return;
    await onCreateModifier(optionName.trim(), price);
    setOptionName('');
    setOptionPrice('0');
  };

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#fbf8f4] px-4 py-5 sm:px-6">
      <div className="max-w-md">
        <p className="mb-2 text-xs text-stone-500">ชื่อกลุ่ม</p>
        <input value={draft.name} disabled={isDisabled} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} maxLength={100} placeholder="ใส่ชื่อกลุ่มตัวเลือกเสริม..." className="w-full rounded-xl border border-[#d9d2ca] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-stone-300 focus:border-[#bd9474] disabled:bg-[#f0ece7]" />

        <p className="mb-2 mt-5 text-xs text-stone-500">ประเภทการเลือก</p>
        <div className="flex gap-3">
          {([['single', 'เลือกได้ 1 ตัวเลือก'], ['multi', 'เลือกได้หลายตัวเลือก']] as const).map(([type, label]) => (
            <button key={type} type="button" disabled={isDisabled} onClick={() => setDraft(current => ({ ...current, selection_type: type as SelectionType }))} className={`min-w-44 rounded-xl border px-4 py-2 text-xs transition ${draft.selection_type === type ? 'border-[#b78e70] bg-[#fcf6ea] text-[#4d3829]' : 'border-[#d9d2ca] bg-white text-stone-500'} disabled:opacity-50`}>
              {label}
            </button>
          ))}
        </div>

        <label className="mt-5 flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={draft.is_required} disabled={isDisabled} onChange={event => setDraft(current => ({ ...current, is_required: event.target.checked }))} className="h-4 w-4 accent-[#b78e70]" /> บังคับให้ลูกค้าเลือก</label>

        <div className="mt-5 flex justify-end"><button type="button" disabled={isDisabled || !draft.name.trim()} onClick={() => void onSaveGroup({ ...draft, name: draft.name.trim() })} className="rounded-xl bg-[#b78e70] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9f775a] disabled:opacity-50">{busy ? 'กำลังบันทึก...' : group ? 'บันทึกกลุ่ม' : 'สร้างกลุ่ม'}</button></div>
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        {group && <section className="mt-6 border-t border-[#e5ddd5] pt-4">
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_4.25rem_2.25rem] gap-2 px-1 text-xs text-stone-500"><span>ตัวเลือก</span><span className="text-right">ราคา</span><span /></div>
          <div className="space-y-2">{group.modifiers.map(item => <ModifierOptionRow key={item.modifier_id} item={item} disabled={isDisabled} onSave={async (name, price) => { await onUpdateModifier(item, name, price); }} onToggleActive={async active => { await onToggleModifier(item, active); }} />)}</div>
          {group.is_active && <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.25rem_auto] gap-2">
            <input value={optionName} disabled={busy} maxLength={100} onChange={event => setOptionName(event.target.value)} placeholder="ชื่อตัวเลือก" className="min-w-0 rounded-xl border border-[#d9d2ca] bg-white px-3 py-2 text-xs outline-none focus:border-[#bd9474]" />
            <input value={optionPrice} disabled={busy} type="number" min="0" step="0.01" onChange={event => setOptionPrice(event.target.value)} className="w-full rounded-xl border border-[#d9d2ca] bg-white px-2 py-2 text-right text-xs outline-none focus:border-[#bd9474]" />
            <button type="button" disabled={busy || !optionName.trim() || Number(optionPrice) < 0} onClick={() => void submitOption()} className="flex items-center justify-center gap-1 rounded-full border border-[#d9d2ca] px-3 py-2 text-xs text-stone-600 hover:bg-white disabled:opacity-50"><Plus size={14} /> เพิ่มตัวเลือก</button>
          </div>}
        </section>}
      </div>
    </main>
  );
}
