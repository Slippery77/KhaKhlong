import { useState } from 'react';
import { Check, PackagePlus, Trash2 } from 'lucide-react';
import type { InventoryItem } from '../types/inventory.types';

interface StockTransactionFormProps {
  items: InventoryItem[];
  isSubmitting: boolean;
  onRestock: (ingredientId: string, quantity: number, note?: string) => Promise<boolean>;
  onWaste: (
    ingredientId: string,
    quantity: number,
    reason: 'expired' | 'spoiled' | 'dropped' | 'other',
    note?: string,
  ) => Promise<boolean>;
}

const fieldClass =
  'w-full rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20';

export default function StockTransactionForm({ items, isSubmitting, onRestock, onWaste }: StockTransactionFormProps) {
  const [mode, setMode] = useState<'restock' | 'waste'>('restock');
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [usePurchaseUnit, setUsePurchaseUnit] = useState(false);
  const [reason, setReason] = useState<'expired' | 'spoiled' | 'dropped' | 'other'>('expired');
  const [note, setNote] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const activeItems = items.filter((item) => item.is_active);
  const selectedItem = activeItems.find((item) => item.ingredient_id === ingredientId);

  const parsedQuantity = Number(quantity);
  const isQuantityValid = !Number.isNaN(parsedQuantity) && parsedQuantity > 0;
  const canSubmit = Boolean(ingredientId) && isQuantityValid && !isSubmitting;

  const submit = async () => {
    if (!canSubmit || !selectedItem) return;
    const stockQuantity =
      mode === 'restock' && usePurchaseUnit && selectedItem.purchase_to_stock_ratio
        ? parsedQuantity * selectedItem.purchase_to_stock_ratio
        : parsedQuantity;
    const success =
      mode === 'restock'
        ? await onRestock(ingredientId, stockQuantity, note || undefined)
        : await onWaste(ingredientId, parsedQuantity, reason, note || undefined);
    if (success) {
      setIngredientId('');
      setQuantity('');
      setNote('');
      setSuccessMessage(mode === 'restock' ? 'บันทึกรับของเข้าเรียบร้อยแล้ว' : 'บันทึกของเสียเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const activeUnit =
    mode === 'restock' && usePurchaseUnit ? selectedItem?.purchase_unit : selectedItem?.stock_unit;

  return (
    <section className="mb-5 rounded-2xl border border-[#E8DFD5] bg-white p-4">
      {/* โหมด: รับของเข้า / ของเสีย */}
      <div className="mb-3 flex items-center gap-2" role="tablist" aria-label="ประเภทการเคลื่อนไหวสต็อก">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'restock'}
          onClick={() => setMode('restock')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 ${
            mode === 'restock'
              ? 'bg-[#8C6D58] text-white'
              : 'bg-[#EFE8DC] text-stone-600 hover:bg-[#E5DCCF] hover:text-[#2D241E]'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          รับของเข้า
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'waste'}
          onClick={() => setMode('waste')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 ${
            mode === 'waste'
              ? 'bg-rose-600 text-white'
              : 'bg-[#EFE8DC] text-stone-600 hover:bg-rose-50 hover:text-rose-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          บันทึกของเสีย
        </button>
        {successMessage && (
          <span role="status" className="ml-2 flex items-center gap-1.5 text-sm text-emerald-700">
            <Check className="w-4 h-4" />
            {successMessage}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_2fr] md:items-start">
        <div>
          <label htmlFor="stock-tx-ingredient" className="mb-1 block text-xs font-medium text-stone-500">
            วัตถุดิบ
          </label>
          <select
            id="stock-tx-ingredient"
            value={ingredientId}
            onChange={(event) => {
              setIngredientId(event.target.value);
              setUsePurchaseUnit(false);
            }}
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="">เลือกวัตถุดิบ</option>
            {activeItems.map((item) => (
              <option key={item.ingredient_id} value={item.ingredient_id}>
                {item.name} ({item.stock_unit})
              </option>
            ))}
          </select>
          {selectedItem && (
            <p className="mt-1 text-xs text-stone-500">
              คงเหลือปัจจุบัน{' '}
              <span className={`font-semibold ${selectedItem.is_low ? 'text-rose-500' : 'text-[#2D241E]'}`}>
                {selectedItem.current_stock}
              </span>{' '}
              {selectedItem.stock_unit}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="stock-tx-quantity" className="mb-1 block text-xs font-medium text-stone-500">
            จำนวน
          </label>
          <div className="relative">
            <input
              id="stock-tx-quantity"
              type="number"
              min="0.0001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={activeUnit ? `เป็น ${activeUnit}` : 'จำนวน'}
              className={`${fieldClass} ${activeUnit ? 'pr-14' : ''}`}
            />
            {activeUnit && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                {activeUnit}
              </span>
            )}
          </div>
          {mode === 'restock' && selectedItem?.purchase_unit && selectedItem.purchase_to_stock_ratio && (
            <label className="mt-1 flex cursor-pointer items-center gap-1 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={usePurchaseUnit}
                onChange={(event) => setUsePurchaseUnit(event.target.checked)}
                className="cursor-pointer accent-[#8C6D58]"
              />
              ซื้อเป็น {selectedItem.purchase_unit} = {selectedItem.purchase_to_stock_ratio} {selectedItem.stock_unit}
            </label>
          )}
        </div>

        <div>
          {mode === 'waste' ? (
            <>
              <label htmlFor="stock-tx-reason" className="mb-1 block text-xs font-medium text-stone-500">
                สาเหตุ
              </label>
              <select
                id="stock-tx-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value as typeof reason)}
                className={`${fieldClass} cursor-pointer`}
              >
                <option value="expired">หมดอายุ</option>
                <option value="spoiled">เน่าเสีย</option>
                <option value="dropped">เสียหาย/ทำตก</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        <div>
          <label htmlFor="stock-tx-note" className="mb-1 block text-xs font-medium text-stone-500">
            หมายเหตุ (ไม่บังคับ)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="stock-tx-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canSubmit) void submit();
              }}
              placeholder="เช่น เลขใบเสร็จ, มัดจำ"
              className={`${fieldClass} flex-1`}
            />
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void submit()}
              className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-5 py-2 text-sm text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 focus-visible:ring-offset-2 ${
                mode === 'waste' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#8C6D58] hover:bg-[#7a5c45]'
              } ${!canSubmit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>

      {!canSubmit && !isSubmitting && (
        <p className="mt-2 text-xs text-stone-400">
          {ingredientId ? 'กรอกจำนวนมากกว่า 0 เพื่อบันทึก' : 'เลือกวัตถุดิบและกรอกจำนวนเพื่อบันทึก'}
        </p>
      )}
    </section>
  );
}
