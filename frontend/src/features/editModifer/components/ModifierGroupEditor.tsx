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
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#FAF7F2] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-2xl border border-[#E8DFD5] bg-white shadow-sm">
          <header className="border-b border-[#E8DFD5] px-6 py-4">
            <h2 className="text-base font-medium text-[#2D241E]">{group ? 'รายละเอียดกลุ่มตัวเลือก' : 'สร้างกลุ่มตัวเลือกใหม่'}</h2>
            <p className="mt-0.5 text-sm text-stone-500">
              {group ? 'แก้ไขชื่อ ประเภทการเลือก และตัวเลือกภายในกลุ่ม' : 'ตั้งชื่อกลุ่มและประเภทการเลือกสำหรับเมนู'}
            </p>
          </header>
          <div className="space-y-5 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#2D241E]">
                ชื่อกลุ่ม <span className="text-red-500">*</span>
              </label>
              <input
                value={draft.name}
                disabled={isDisabled}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={100}
                placeholder="เช่น น้ำแข็ง, เพิ่มท็อปปิ้ง, ระดับความหวาน"
                className="w-full rounded-xl border border-[#d9c6b0] px-3 py-2 text-sm outline-none transition-colors placeholder:text-stone-400 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 disabled:bg-[#f6f3ef] disabled:text-stone-400"
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-medium text-[#2D241E]">ประเภทการเลือก</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  ['single', 'เลือกได้ 1 ตัวเลือก'],
                  ['multi', 'เลือกได้หลายตัวเลือก'],
                ] as const).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setDraft((current) => ({ ...current, selection_type: type as SelectionType }))}
                    className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                      draft.selection_type === type
                        ? 'border-[#8C6D58] bg-[#f6f1ec] text-[#2D241E]'
                        : 'border-[#E8DFD5] bg-white text-stone-600 hover:bg-[#FBF9F6]'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[#2D241E]">
              <input
                type="checkbox"
                checked={draft.is_required}
                disabled={isDisabled}
                onChange={(event) => setDraft((current) => ({ ...current, is_required: event.target.checked }))}
                className="h-4 w-4 rounded border-[#d9c6b0] text-[#8C6D58] focus:ring-[#8C6D58]/20"
              />
              บังคับให้ลูกค้าเลือก
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDisabled || !draft.name.trim()}
                onClick={() => void onSaveGroup({ ...draft, name: draft.name.trim() })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8C6D58] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7a5c45] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'กำลังบันทึก...' : group ? 'บันทึกกลุ่ม' : 'สร้างกลุ่ม'}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </section>

        {group && (
          <section className="mt-6 rounded-2xl border border-[#E8DFD5] bg-white shadow-sm">
            <header className="border-b border-[#E8DFD5] px-6 py-4">
              <h2 className="text-base font-medium text-[#2D241E]">ตัวเลือกภายในกลุ่ม</h2>
              <p className="mt-0.5 text-sm text-stone-500">เพิ่ม แก้ไข หรือลบตัวเลือกเสริมของกลุ่มนี้</p>
            </header>
            <div className="px-6 py-5">
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_5rem_2.25rem] items-center gap-3 px-1 text-xs text-stone-500">
                <span>ชื่อตัวเลือก</span>
                <span className="text-right">ราคา (+)</span>
                <span />
              </div>
              <div className="space-y-2">
                {group.modifiers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d9c6b0] bg-[#FBF9F6] px-4 py-6 text-center text-sm text-stone-500">
                    ยังไม่มีตัวเลือก เพิ่มตัวเลือกแรกได้ด้านล่าง
                  </div>
                ) : (
                  group.modifiers.map((item) => (
                    <ModifierOptionRow
                      key={item.modifier_id}
                      item={item}
                      disabled={isDisabled}
                      onSave={async (name, price) => {
                        await onUpdateModifier(item, name, price);
                      }}
                      onToggleActive={async (active) => {
                        await onToggleModifier(item, active);
                      }}
                    />
                  ))
                )}
              </div>
              {group.is_active && (
                <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-[#E8DFD5] bg-[#FBF9F6] p-3 sm:grid-cols-[minmax(0,1fr)_5rem_auto]">
                  <input
                    value={optionName}
                    disabled={busy}
                    maxLength={100}
                    onChange={(event) => setOptionName(event.target.value)}
                    placeholder="ชื่อตัวเลือก เช่น นมข้น, ไข่มุก"
                    className="min-w-0 rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 disabled:bg-[#f6f3ef]"
                  />
                  <input
                    value={optionPrice}
                    disabled={busy}
                    type="number"
                    min="0"
                    step="0.01"
                    onChange={(event) => setOptionPrice(event.target.value)}
                    className="w-full rounded-xl border border-[#d9c6b0] bg-white px-2 py-2 text-right text-sm outline-none transition-colors focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 disabled:bg-[#f6f3ef]"
                  />
                  <button
                    type="button"
                    disabled={busy || !optionName.trim() || Number(optionPrice) < 0}
                    onClick={() => void submitOption()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#8C6D58] px-3 py-2 text-sm text-[#8C6D58] transition-colors hover:bg-[#f6f1ec] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} /> เพิ่มตัวเลือก
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
