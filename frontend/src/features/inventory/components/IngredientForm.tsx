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
    <>
      {/* ── Desktop Form (จอ md ขึ้นไป จัดเป็นตาราง 7 คอลัมน์) ── */}
      <div className="hidden md:grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] items-center gap-3 border-b border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="ชื่อวัตถุดิบ"
          aria-label="ชื่อวัตถุดิบ"
          autoFocus
          className={inputClass}
        />
        {item ? (
          <span className="text-sm font-semibold">{item.current_stock}</span>
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

      {/* ── Mobile Form (จอ < md จัดเป็นฟอร์มการ์ดแบบหลายช่องสวยงาม ไม่ดันขอบจอ) ── */}
      <div className="md:hidden border-b border-[#E8DFD5] bg-[#FAF7F2] p-4 space-y-3 font-kanit">
        <div className="flex items-center justify-between pb-1 border-b border-[#E8DFD5]/70">
          <h3 className="font-semibold text-sm text-[#2D241E]">
            {item ? `แก้ไขวัตถุดิบ: ${item.name}` : 'เพิ่มวัตถุดิบใหม่'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-[#EFE8DC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">ชื่อวัตถุดิบ *</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="เช่น หมู, ไก่, ไข่ไก่"
            aria-label="ชื่อวัตถุดิบ"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              {item ? 'คงเหลือปัจจุบัน' : 'จำนวนเริ่มต้น'}
            </label>
            {item ? (
              <div className="py-2 px-3 bg-stone-100 rounded-xl text-sm font-semibold text-[#2D241E]">
                {item.current_stock} {item.stock_unit}
              </div>
            ) : (
              <input
                type="number"
                min="0"
                value={initialQuantity}
                onChange={(event) => setInitialQuantity(event.target.value)}
                placeholder="0"
                aria-label="จำนวนเริ่มต้น"
                className={inputClass}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">หน่วยสต็อก *</label>
            <input
              value={stockUnit}
              onChange={(event) => setStockUnit(event.target.value)}
              placeholder="เช่น กก., ฟอง, ลิตร"
              aria-label="หน่วยสต็อก"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">หน่วยซื้อ (ถ้ามี)</label>
            <input
              value={purchaseUnit}
              onChange={(event) => setPurchaseUnit(event.target.value)}
              placeholder="เช่น ลัง, แผง"
              aria-label="หน่วยซื้อ"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">อัตราส่วน (ต่อหน่วยซื้อ)</label>
            <input
              type="number"
              min="0.0001"
              value={purchaseRatio}
              onChange={(event) => setPurchaseRatio(event.target.value)}
              placeholder="เช่น 10 (1ลัง=10กก.)"
              aria-label="อัตราส่วนหน่วยซื้อต่อหน่วยสต็อก"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">แจ้งเตือนขั้นต่ำ (ไม่บังคับ)</label>
          <input
            type="number"
            min="0"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="เช่น 2 (เหลือน้อยกว่านี้จะเตือน)"
            aria-label="จำนวนขั้นต่ำ"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void submit()}
            className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#8C6D58] py-2.5 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#7a5c45] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกวัตถุดิบ'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#EFE8DC] py-2.5 px-4 text-sm font-medium text-stone-600 hover:bg-[#E5DCCF] active:scale-95 disabled:cursor-not-allowed"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </>
  );
}
