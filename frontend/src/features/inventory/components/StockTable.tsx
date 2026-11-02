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
    <div className="w-full flex-1 divide-y divide-[#E8DFD5]/70">
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
          <div key={item.ingredient_id} className={`transition-colors duration-200 ${rowTone}`}>
            {/* ── 1. Desktop Row (จอ md ขึ้นไป แสดงเป็นตาราง 7 คอลัมน์) ── */}
            <div className="hidden md:grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] items-center gap-3 px-4 py-4 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {item.is_active && item.is_low && (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#C27803] stroke-[2.2]" aria-label="ใกล้หมด" />
                )}
                <span className={`truncate ${item.is_active ? '' : 'text-stone-500 line-through decoration-stone-300'}`}>
                  {item.name}
                </span>
                {!item.is_active && (
                  <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600">
                    ปิดใช้งาน
                  </span>
                )}
              </div>
              <span className={`font-semibold tabular-nums ${item.is_low && item.is_active ? 'text-rose-500' : 'text-[#2D241E]'}`}>
                {item.current_stock}
              </span>
              <span className="text-stone-600 truncate">{item.stock_unit}</span>
              <span className="text-stone-600 truncate">{item.purchase_unit ?? '-'}</span>
              <span className="text-stone-600 tabular-nums">{item.purchase_to_stock_ratio ?? '-'}</span>
              <span className="text-stone-600 tabular-nums">{item.low_stock_threshold ?? '-'}</span>
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
            </div>

            {/* ── 2. Mobile Card Row (จอ < md จัดเป็น 2 แถวสวยงาม เห็นครบทุกปุ่ม ไม่ต้องเลื่อนจอ) ── */}
            <div className="md:hidden flex flex-col p-3.5 gap-2.5">
              {/* แถวที่ 1: ชื่อวัตถุดิบ + ป้ายเตือน (ซ้าย) vs ยอดคงเหลือ (ขวา) */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {item.is_active && item.is_low && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                      <AlertTriangle className="w-3 h-3 text-[#C27803]" />
                      ใกล้หมด
                    </span>
                  )}
                  <span className={`font-semibold text-base text-[#2D241E] truncate ${item.is_active ? '' : 'text-stone-400 line-through'}`}>
                    {item.name}
                  </span>
                  {!item.is_active && (
                    <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-stone-600">
                      ปิดใช้งาน
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-stone-500 mr-1.5">คงเหลือ</span>
                  <span className={`text-base font-bold tabular-nums ${item.is_low && item.is_active ? 'text-rose-600' : 'text-[#2D241E]'}`}>
                    {item.current_stock}
                  </span>
                  <span className="text-xs text-stone-500 ml-1">{item.stock_unit}</span>
                </div>
              </div>

              {/* ข้อมูลเสริม: หน่วยซื้อ, อัตราส่วน, ขั้นต่ำ */}
              <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl border border-[#EFE8DD]">
                <span>ซื้อเป็น: <strong className="text-stone-700">{item.purchase_unit ?? '-'}</strong></span>
                <span>•</span>
                <span>อัตรา: <strong className="text-stone-700">{item.purchase_to_stock_ratio ? `1=${item.purchase_to_stock_ratio}` : '-'}</strong></span>
                <span>•</span>
                <span>ขั้นต่ำ: <strong className="text-stone-700">{item.low_stock_threshold ? `${item.low_stock_threshold} ${item.stock_unit}` : '-'}</strong></span>
              </div>

              {/* แถวที่ 2: ปุ่มจัดการ ปรับสต็อก / แก้ไข / ลบ (เห็นครบทุกปุ่ม ไม่ตกขอบ) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                {item.is_active ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => openAdjustment(item)}
                      className="flex-1 cursor-pointer rounded-xl border border-[#DECDBB] bg-[#FAF7F2] py-2 px-3 text-xs font-semibold text-[#7A5E3F] transition-all hover:bg-[#8C6D58] hover:text-white active:scale-95 text-center shadow-xs"
                    >
                      ปรับสต็อก
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        title="แก้ไข"
                        aria-label={`แก้ไข ${item.name}`}
                        onClick={() => {
                          setAdjustingItem(null);
                          setEditingId(item.ingredient_id);
                        }}
                        className="flex items-center gap-1 cursor-pointer rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs text-stone-600 hover:bg-[#FAF7F2] hover:text-[#2D241E] active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#8C6D58]" />
                        <span>แก้ไข</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        title="ปิดใช้งาน"
                        aria-label={`ปิดใช้งาน ${item.name}`}
                        onClick={() => {
                          if (window.confirm(`ปิดการใช้งาน ${item.name} หรือไม่?`)) void onDelete(item.ingredient_id);
                        }}
                        className="flex items-center gap-1 cursor-pointer rounded-xl border border-rose-200 bg-white py-2 px-3 text-xs text-rose-600 hover:bg-rose-50 active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void onReactivate(item.ingredient_id)}
                    className="w-full flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                  >
                    <Power className="w-3.5 h-3.5" />
                    เปิดใช้งาน
                  </button>
                )}
              </div>
            </div>

            {/* แถบปรับสต็อกแบบนับจริงเมื่อกดปุ่ม "ปรับสต็อก" (สำหรับทั้ง Desktop และ Mobile) */}
            {isAdjusting && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF7F2] p-3 px-4 border-t border-[#DECDBB]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-600">
                    ยอดนับจริงของ <strong>{item.name}</strong>:
                  </span>
                  <div className="flex overflow-hidden rounded-xl border border-stone-300 bg-white">
                    <button
                      type="button"
                      aria-label="ลดจำนวน"
                      onClick={() => setCountedQuantity((value) => Math.max(0, Number(value || 0) - 1).toString())}
                      className="cursor-pointer px-2.5 py-1.5 text-stone-500 hover:bg-[#EFE8DC]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={countedQuantity}
                      aria-label={`ยอดนับจริงของ ${item.name}`}
                      onChange={(event) => setCountedQuantity(event.target.value)}
                      className="w-16 border-x border-stone-300 py-1 text-center text-sm font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="เพิ่มจำนวน"
                      onClick={() => setCountedQuantity((value) => (Number(value || 0) + 1).toString())}
                      className="cursor-pointer px-2.5 py-1.5 text-stone-500 hover:bg-[#EFE8DC]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-stone-600">{item.stock_unit}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void saveStockCount()}
                    className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#8C6D58] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7a5c45]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    ตกลง
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setAdjustingItem(null)}
                    className="cursor-pointer text-xs font-medium text-stone-500 hover:text-stone-800 px-2 py-1.5"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
