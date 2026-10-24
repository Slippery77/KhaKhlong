import { useState } from 'react';
import { Check, X } from 'lucide-react';
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

const inputClass =
  'w-full rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20';

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
    )
      return;

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
    <div className="grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] items-center gap-3 border-b border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3.5">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="ชื่อวัตถุดิบ"
        aria-label="ชื่อวัตถุดิบ"
        autoFocus
        className={inputClass}
      />
      {item ? (
        <span className="text-sm">{item.current_stock}</span>
      ) : (
        <input
          type="number"
          min="0"
          value={initialQuantity}
          onChange={(event) => setInitialQuantity(event.target.value)}
          placeholder="เริ่มต้น"
          aria-label="จำนวนเริ่มต้น"
          className={inputClass}
        />
      )}
      <input
        value={stockUnit}
        onChange={(event) => setStockUnit(event.target.value)}
        placeholder="หน่วยสต็อก"
        aria-label="หน่วยสต็อก"
        className={inputClass}
      />
      <input
        value={purchaseUnit}
        onChange={(event) => setPurchaseUnit(event.target.value)}
        placeholder="หน่วยซื้อ"
        aria-label="หน่วยซื้อ"
        className={inputClass}
      />
      <input
        type="number"
        min="0.0001"
        value={purchaseRatio}
        onChange={(event) => setPurchaseRatio(event.target.value)}
        placeholder="อัตรา"
        aria-label="อัตราส่วนหน่วยซื้อต่อหน่วยสต็อก"
        className={inputClass}
      />
      <input
        type="number"
        min="0"
        value={threshold}
        onChange={(event) => setThreshold(event.target.value)}
        placeholder="ขั้นต่ำ"
        aria-label="จำนวนขั้นต่ำ"
        className={inputClass}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submit()}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#8C6D58] px-3 py-2 text-sm text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          บันทึก
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#EFE8DC] px-3 py-2 text-sm text-stone-600 transition-colors duration-200 hover:bg-[#E5DCCF] hover:text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4" />
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
