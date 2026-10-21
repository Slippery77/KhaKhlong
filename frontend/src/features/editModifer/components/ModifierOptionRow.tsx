import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ModifierItem } from '../types/modifier.types';

interface Props {
  item: ModifierItem;
  disabled: boolean;
  onSave: (name: string, price: number) => Promise<void>;
  onToggleActive: (active: boolean) => Promise<void>;
}

export default function ModifierOptionRow({ item, disabled, onSave, onToggleActive }: Props) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price_delta));
  useEffect(() => { setName(item.name); setPrice(String(item.price_delta)); }, [item]);
  const priceNumber = Number(price);
  const changed = name.trim() !== item.name || priceNumber !== item.price_delta;

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_4.25rem_2.25rem] items-center gap-2 ${item.is_active ? '' : 'opacity-45'}`}>
      <input disabled={disabled || !item.is_active} value={name} maxLength={100} onChange={event => setName(event.target.value)} className="min-w-0 rounded-xl border border-[#d9d2ca] bg-white px-3 py-2 text-xs outline-none focus:border-[#bd9474] disabled:bg-[#f4f0eb]" />
      <input disabled={disabled || !item.is_active} value={price} type="number" min="0" step="0.01" onChange={event => setPrice(event.target.value)} className="w-full rounded-xl border border-[#d9d2ca] bg-white px-2 py-2 text-right text-xs outline-none focus:border-[#bd9474] disabled:bg-[#f4f0eb]" />
      <div className="flex items-center justify-end gap-0.5">
        {item.is_active && changed && name.trim() && Number.isFinite(priceNumber) && priceNumber >= 0 && <button type="button" disabled={disabled} onClick={() => void onSave(name.trim(), priceNumber)} title="บันทึก" className="rounded-lg p-1.5 text-[#917052] hover:bg-[#f2e6d9]"><Check size={15} /></button>}
        <button type="button" disabled={disabled} onClick={() => void onToggleActive(!item.is_active)} title={item.is_active ? 'ลบตัวเลือก' : 'เปิดใช้ตัวเลือก'} className="rounded-lg p-1.5 text-[#a18c7a] hover:bg-[#f2e6d9]">
          {item.is_active ? <Trash2 size={15} /> : <RotateCcw size={15} />}
        </button>
      </div>
    </div>
  );
}
