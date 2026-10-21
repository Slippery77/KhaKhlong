import { useState } from 'react';
import type {
  IngredientInput,
  InventoryItem,
  NewIngredientInput,
} from '../types/inventory.types';

interface IngredientFormProps {
  item?: InventoryItem;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: IngredientInput | NewIngredientInput) => Promise<boolean>;
}

export default function IngredientForm({ item, isSubmitting, onCancel, onSubmit }: IngredientFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [stockUnit, setStockUnit] = useState(item?.stock_unit ?? 'กก.');
  const [purchaseUnit, setPurchaseUnit] = useState(item?.purchase_unit ?? '');
  const [purchaseRatio, setPurchaseRatio] = useState(item?.purchase_to_stock_ratio?.toString() ?? '');
  const [threshold, setThreshold] = useState(item?.low_stock_threshold?.toString() ?? '');
  const [initialQuantity, setInitialQuantity] = useState('');

  const submit = async () => {
    const parsedThreshold = threshold === '' ? undefined : Number(threshold);
    const parsedRatio = purchaseRatio === '' ? undefined : Number(purchaseRatio);
    const parsedInitialQuantity = initialQuantity === '' ? 0 : Number(initialQuantity);
    if (
      !name.trim() ||
      !stockUnit.trim() ||
      (parsedThreshold !== undefined && (Number.isNaN(parsedThreshold) || parsedThreshold < 0)) ||
      (parsedRatio !== undefined && (Number.isNaN(parsedRatio) || parsedRatio <= 0)) ||
      (!item && (Number.isNaN(parsedInitialQuantity) || parsedInitialQuantity < 0))
    ) return;

    const input: IngredientInput = {
      name: name.trim(),
      stock_unit: stockUnit.trim(),
      ...(purchaseUnit.trim() ? { purchase_unit: purchaseUnit.trim() } : {}),
      ...(parsedRatio !== undefined ? { purchase_to_stock_ratio: parsedRatio } : {}),
      ...(parsedThreshold !== undefined ? { low_stock_threshold: parsedThreshold } : {}),
    };
    if (await onSubmit(item ? input : { ...input, initial_quantity: parsedInitialQuantity })) onCancel();
  };

  return (
    <div className="grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] items-center gap-3 px-4 py-3.5 border-b border-[#E8DFD5] bg-[#FAF7F2]">
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="ชื่อวัตถุดิบ" className="w-full bg-white border-2 border-[#C4A88E] rounded-xl px-3 py-2 text-sm focus:outline-none" autoFocus />
      {item ? <span className="text-sm">{item.current_stock}</span> : <input type="number" min="0" value={initialQuantity} onChange={(event) => setInitialQuantity(event.target.value)} placeholder="เริ่มต้น" className="w-full bg-white border rounded-xl px-3 py-2 text-sm" />}
      <input value={stockUnit} onChange={(event) => setStockUnit(event.target.value)} placeholder="หน่วยสต็อก" className="w-full bg-white border rounded-xl px-3 py-2 text-sm" />
      <input value={purchaseUnit} onChange={(event) => setPurchaseUnit(event.target.value)} placeholder="หน่วยซื้อ" className="w-full bg-white border rounded-xl px-3 py-2 text-sm" />
      <input type="number" min="0.0001" value={purchaseRatio} onChange={(event) => setPurchaseRatio(event.target.value)} placeholder="อัตรา" className="w-full bg-white border rounded-xl px-3 py-2 text-sm" />
      <input type="number" min="0" value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder="ขั้นต่ำ" className="w-full bg-white border rounded-xl px-3 py-2 text-sm" />
      <div className="flex justify-end gap-2"><button type="button" disabled={isSubmitting} onClick={() => void submit()} className="px-3 py-2 rounded-xl bg-[#8C6D58] text-white text-sm disabled:opacity-50">บันทึก</button><button type="button" disabled={isSubmitting} onClick={onCancel} className="px-3 py-2 rounded-xl bg-[#EFE8DC] text-stone-600 text-sm">ยกเลิก</button></div>
    </div>
  );
}
