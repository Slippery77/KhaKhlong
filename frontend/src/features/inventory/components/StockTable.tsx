import { useState } from 'react';
import { AlertTriangle, Check, Minus, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import IngredientForm from './IngredientForm';
import type { IngredientInput, InventoryItem } from '../types/inventory.types';

interface StockTableProps {
  items: InventoryItem[];
  isSubmitting: boolean;
  onUpdate: (ingredientId: string, input: IngredientInput) => Promise<boolean>;
  onDelete: (ingredientId: string) => Promise<boolean>;
  onReactivate: (ingredientId: string) => Promise<boolean>;
  onRecordStockCount: (ingredientId: string, quantity: number) => Promise<boolean>;
}

export default function StockTable({
  items,
  isSubmitting,
  onUpdate,
  onDelete,
  onReactivate,
  onRecordStockCount,
}: StockTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [countedQuantity, setCountedQuantity] = useState('');

  const openAdjustment = (item: InventoryItem) => {
    setEditingId(null);
    setAdjustingItem(item);
    setCountedQuantity(item.current_stock.toString());
  };

  const saveStockCount = async () => {
    if (!adjustingItem) return;
    const quantity = Number(countedQuantity);
    if (Number.isNaN(quantity) || quantity < 0) return;
    if (await onRecordStockCount(adjustingItem.ingredient_id, quantity)) {
      setAdjustingItem(null);
    }
  };

  return (
    <div className="w-full overflow-x-auto flex-1">
      <div className="divide-y divide-[#E8DFD5]/70">
        {items.map((item) => {
          const isEditing = editingId === item.ingredient_id;
          const isAdjusting = adjustingItem?.ingredient_id === item.ingredient_id;

          if (isEditing) {
            return (
              <IngredientForm
                key={item.ingredient_id}
                item={item}
                isSubmitting={isSubmitting}
                onCancel={() => setEditingId(null)}
                onSubmit={(input) => onUpdate(item.ingredient_id, input as IngredientInput)}
              />
            );
          }

          const rowTone = !item.is_active
            ? 'bg-stone-50/80 opacity-70'
            : item.is_low
              ? 'bg-amber-50/70 hover:bg-amber-50'
              : 'hover:bg-white/60';

          return (
            <div
              key={item.ingredient_id}
              className={`grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] items-center gap-3 px-4 py-4 transition-colors duration-200 text-sm ${rowTone}`}
            >
              <div className="flex items-center gap-2">
                {item.is_active && item.is_low && (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#C27803] stroke-[2.2]" aria-label="ใกล้หมด" />
                )}
                <span className={item.is_active ? '' : 'text-stone-500 line-through decoration-stone-300'}>
                  {item.name}
                </span>
                {!item.is_active && (
                  <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600">
                    ปิดใช้งาน
                  </span>
                )}
              </div>
              <span className={`font-semibold ${item.is_low && item.is_active ? 'text-rose-500' : 'text-[#2D241E]'}`}>
                {item.current_stock}
              </span>
              <span className="text-stone-600">{item.stock_unit}</span>
              <span className="text-stone-600">{item.purchase_unit ?? '-'}</span>
              <span className="text-stone-600">{item.purchase_to_stock_ratio ?? '-'}</span>
              <span className="text-stone-600">{item.low_stock_threshold ?? '-'}</span>
              <div className="flex items-center justify-end gap-2.5">
                {item.is_active ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => openAdjustment(item)}
                      className="cursor-pointer rounded-xl border border-[#DECDBB] bg-[#FAF7F2] px-3.5 py-1.5 text-xs font-medium text-[#7A5E3F] transition-colors duration-200 hover:border-[#8C6D58] hover:bg-[#8C6D58] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ปรับสต็อก
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      title="แก้ไข"
                      aria-label={`แก้ไข ${item.name}`}
                      onClick={() => {
                        setAdjustingItem(null);
                        setEditingId(item.ingredient_id);
                      }}
                      className="cursor-pointer rounded-lg p-1.5 text-stone-400 transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      title="ปิดใช้งาน"
                      aria-label={`ปิดใช้งาน ${item.name}`}
                      onClick={() => {
                        if (window.confirm(`ปิดการใช้งาน ${item.name} หรือไม่?`)) void onDelete(item.ingredient_id);
                      }}
                      className="cursor-pointer rounded-lg p-1.5 text-stone-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void onReactivate(item.ingredient_id)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs text-white transition-colors duration-200 hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Power className="w-3.5 h-3.5" />
                    เปิดใช้
                  </button>
                )}
              </div>
              {isAdjusting && (
                <div className="col-span-full flex flex-wrap items-center gap-3 border-t border-[#E8DFD5]/60 pt-3 pb-1 text-sm">
                  <span>
                    นับ <strong>{item.name}</strong> จริง
                  </span>
                  <div className="flex overflow-hidden rounded-xl border border-stone-200 bg-white">
                    <button
                      type="button"
                      aria-label="ลดจำนวน"
                      onClick={() => setCountedQuantity((value) => Math.max(0, Number(value || 0) - 1).toString())}
                      className="cursor-pointer px-1.5 py-1.5 text-stone-500 transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus-visible:bg-[#EFE8DC]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={countedQuantity}
                      aria-label={`ยอดนับจริงของ ${item.name}`}
                      onChange={(event) => setCountedQuantity(event.target.value)}
                      className="w-20 border-x border-stone-200 py-1 text-center focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:ring-inset"
                    />
                    <button
                      type="button"
                      aria-label="เพิ่มจำนวน"
                      onClick={() => setCountedQuantity((value) => (Number(value || 0) + 1).toString())}
                      className="cursor-pointer px-1.5 py-1.5 text-stone-500 transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus-visible:bg-[#EFE8DC]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-stone-600">{item.stock_unit}</span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void saveStockCount()}
                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-[#8C6D58] px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    ตกลง
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setAdjustingItem(null)}
                    className="cursor-pointer text-xs font-medium text-stone-500 transition-colors duration-200 hover:text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
