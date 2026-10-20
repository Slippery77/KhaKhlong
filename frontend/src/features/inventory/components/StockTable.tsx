import { useState } from 'react';
import { AlertTriangle, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
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
  onRecordStockCount,
  onReactivate,
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
            return <IngredientForm key={item.ingredient_id} item={item} isSubmitting={isSubmitting} onCancel={() => setEditingId(null)} onSubmit={(input) => onUpdate(item.ingredient_id, input as IngredientInput)} />;
          }

          return (
            <div key={item.ingredient_id} className="grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] items-center gap-3 px-4 py-4 hover:bg-white/40 transition-colors text-sm">
              <div className="flex items-center gap-2">
                {item.is_low && <AlertTriangle className="w-4 h-4 text-[#C27803] shrink-0 stroke-[2.2]" />}
                <span>{item.name}</span>
              </div>
              <span className={`font-semibold ${item.is_low ? 'text-rose-500' : 'text-[#2D241E]'}`}>{item.current_stock}</span>
              <span className="text-stone-600">{item.stock_unit}</span>
              <span className="text-stone-600">{item.purchase_unit ?? '-'}</span>
              <span className="text-stone-600">{item.purchase_to_stock_ratio ?? '-'}</span>
              <span className="text-stone-600">{item.low_stock_threshold ?? '-'}</span>
              <div className="flex items-center justify-end gap-2.5">
                {item.is_active ? <><button type="button" disabled={isSubmitting} onClick={() => openAdjustment(item)} className="px-3.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#DECDBB] text-[#7A5E3F] text-xs font-medium disabled:opacity-50">ปรับสต็อก</button><button type="button" disabled={isSubmitting} title="แก้ไข" onClick={() => { setAdjustingItem(null); setEditingId(item.ingredient_id); }} className="p-1.5 text-stone-400 hover:text-stone-600 disabled:opacity-50"><Pencil className="w-4 h-4" /></button><button type="button" disabled={isSubmitting} title="ปิดใช้งาน" onClick={() => { if (window.confirm(`ปิดการใช้งาน ${item.name} หรือไม่?`)) void onDelete(item.ingredient_id); }} className="p-1.5 text-stone-400 hover:text-rose-500 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button></> : <button type="button" disabled={isSubmitting} onClick={() => void onReactivate(item.ingredient_id)} className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs disabled:opacity-50">เปิดใช้</button>}
              </div>
              {isAdjusting && (
                <div className="col-span-full flex items-center gap-3 pt-3 pb-1 border-t border-[#E8DFD5]/60 text-sm">
                  <span>นับ {item.name} จริง</span>
                  <div className="flex items-center border border-stone-200 rounded-xl bg-white overflow-hidden">
                    <button type="button" onClick={() => setCountedQuantity((value) => Math.max(0, Number(value || 0) - 1).toString())} className="p-1.5"><Minus className="w-3.5 h-3.5" /></button>
                    <input type="number" min="0" value={countedQuantity} onChange={(event) => setCountedQuantity(event.target.value)} className="w-20 py-1 text-center border-x border-stone-200 focus:outline-none" />
                    <button type="button" onClick={() => setCountedQuantity((value) => (Number(value || 0) + 1).toString())} className="p-1.5"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <span className="text-stone-600">{item.stock_unit}</span>
                  <button type="button" disabled={isSubmitting} onClick={() => void saveStockCount()} className="px-3 py-1 bg-[#8C6D58] text-white text-xs font-medium rounded-lg disabled:opacity-50">ตกลง</button>
                  <button type="button" disabled={isSubmitting} onClick={() => setAdjustingItem(null)} className="text-stone-500 text-xs font-medium">ยกเลิก</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
