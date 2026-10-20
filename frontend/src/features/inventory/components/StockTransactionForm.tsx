import { useState } from 'react';
import type { InventoryItem } from '../types/inventory.types';

interface StockTransactionFormProps {
  items: InventoryItem[];
  isSubmitting: boolean;
  onRestock: (ingredientId: string, quantity: number, note?: string) => Promise<boolean>;
  onWaste: (ingredientId: string, quantity: number, reason: 'expired' | 'spoiled' | 'dropped' | 'other', note?: string) => Promise<boolean>;
}

export default function StockTransactionForm({ items, isSubmitting, onRestock, onWaste }: StockTransactionFormProps) {
  const [mode, setMode] = useState<'restock' | 'waste'>('restock');
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [usePurchaseUnit, setUsePurchaseUnit] = useState(false);
  const [reason, setReason] = useState<'expired' | 'spoiled' | 'dropped' | 'other'>('expired');
  const [note, setNote] = useState('');
  const activeItems = items.filter((item) => item.is_active);
  const selectedItem = activeItems.find((item) => item.ingredient_id === ingredientId);

  const submit = async () => {
    const value = Number(quantity);
    if (!ingredientId || Number.isNaN(value) || value <= 0) return;
    const stockQuantity = usePurchaseUnit && selectedItem?.purchase_to_stock_ratio
      ? value * selectedItem.purchase_to_stock_ratio
      : value;
    const success = mode === 'restock'
      ? await onRestock(ingredientId, stockQuantity, note)
      : await onWaste(ingredientId, value, reason, note);
    if (success) { setIngredientId(''); setQuantity(''); setNote(''); }
  };

  return <section className="mb-5 rounded-2xl border border-[#E8DFD5] bg-white p-4"><div className="mb-3 flex gap-2"><button type="button" onClick={() => setMode('restock')} className={`rounded-lg px-3 py-1.5 text-sm ${mode === 'restock' ? 'bg-[#8C6D58] text-white' : 'bg-[#EFE8DC]'}`}>รับของเข้า</button><button type="button" onClick={() => setMode('waste')} className={`rounded-lg px-3 py-1.5 text-sm ${mode === 'waste' ? 'bg-rose-600 text-white' : 'bg-[#EFE8DC]'}`}>บันทึกของเสีย</button></div><div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]"><select value={ingredientId} onChange={(event) => { setIngredientId(event.target.value); setUsePurchaseUnit(false); }} className="rounded-xl border px-3 py-2 text-sm"><option value="">เลือกวัตถุดิบ</option>{activeItems.map((item) => <option key={item.ingredient_id} value={item.ingredient_id}>{item.name} ({item.stock_unit})</option>)}</select><div><input type="number" min="0.0001" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={`จำนวน (${usePurchaseUnit ? selectedItem?.purchase_unit : selectedItem?.stock_unit ?? ''})`} className="w-full rounded-xl border px-3 py-2 text-sm" />{mode === 'restock' && selectedItem?.purchase_unit && selectedItem.purchase_to_stock_ratio && <label className="mt-1 flex items-center gap-1 text-xs text-stone-600"><input type="checkbox" checked={usePurchaseUnit} onChange={(event) => setUsePurchaseUnit(event.target.checked)} />ซื้อเป็น {selectedItem.purchase_unit} = {selectedItem.purchase_to_stock_ratio} {selectedItem.stock_unit}</label>}</div>{mode === 'waste' ? <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="rounded-xl border px-3 py-2 text-sm"><option value="expired">หมดอายุ</option><option value="spoiled">เน่าเสีย</option><option value="dropped">เสียหาย/ทำตก</option><option value="other">อื่น ๆ</option></select> : <span /> }<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="หมายเหตุ / เลขใบเสร็จ" className="rounded-xl border px-3 py-2 text-sm" /><button type="button" disabled={isSubmitting} onClick={() => void submit()} className="rounded-xl bg-[#8C6D58] px-4 py-2 text-sm text-white disabled:opacity-50">บันทึก</button></div></section>;
}
