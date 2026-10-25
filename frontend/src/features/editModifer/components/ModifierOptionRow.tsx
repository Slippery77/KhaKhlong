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
  useEffect(() => {
    setName(item.name);
    setPrice(String(item.price_delta));
  }, [item]);
  const priceNumber = Number(price);
  const changed = name.trim() !== item.name || priceNumber !== item.price_delta;

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_5rem_2.25rem] items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
        item.is_active ? 'border-[#E8DFD5] bg-white' : 'border-dashed border-[#d9c6b0] bg-[#FBF9F6] opacity-70'
      }`}
    >
      <input
        disabled={disabled || !item.is_active}
        value={name}
        maxLength={100}
        onChange={(event) => setName(event.target.value)}
        className="min-w-0 rounded-lg border border-transparent px-2 py-1.5 text-sm outline-none transition-colors focus:border-[#8C6D58] focus:bg-white disabled:cursor-not-allowed disabled:bg-transparent"
      />
      <input
        disabled={disabled || !item.is_active}
        value={price}
        type="number"
        min="0"
        step="0.01"
        onChange={(event) => setPrice(event.target.value)}
        className="w-full rounded-lg border border-transparent px-2 py-1.5 text-right text-sm outline-none transition-colors focus:border-[#8C6D58] focus:bg-white disabled:cursor-not-allowed disabled:bg-transparent"
      />
      <div className="flex items-center justify-end gap-0.5">
        {item.is_active && changed && name.trim() && Number.isFinite(priceNumber) && priceNumber >= 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onSave(name.trim(), priceNumber)}
            title="บันทึก"
            className="rounded-lg p-1.5 text-[#8C6D58] transition-colors hover:bg-[#f6f1ec] cursor-pointer"
          >
            <Check size={16} />
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onToggleActive(!item.is_active)}
          title={item.is_active ? 'ลบตัวเลือก' : 'เปิดใช้ตัวเลือก'}
          className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-[#f6f1ec] hover:text-[#8C6D58] cursor-pointer"
        >
          {item.is_active ? <Trash2 size={16} /> : <RotateCcw size={16} />}
        </button>
      </div>
    </div>
  );
}
