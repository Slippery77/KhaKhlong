import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import type { InventoryItem, InventoryTransaction, InventoryTransactionType } from '../types/inventory.types';

interface InventoryHistoryProps {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  total: number;
  offset: number;
  limit: number;
  type?: InventoryTransactionType;
  ingredientId?: string;
  isLoading: boolean;
  error: string | null;
  setType: (value: InventoryTransactionType | undefined) => void;
  setIngredientId: (value: string | undefined) => void;
  previousPage: () => void;
  nextPage: () => void;
}

const labels: Record<InventoryTransactionType, string> = {
  restock: 'รับของเข้า',
  adjustment: 'ปรับจากการนับ',
  waste: 'ของเสีย',
};

const reasonLabels: Record<string, string> = {
  expired: 'หมดอายุ',
  spoiled: 'เน่าเสีย',
  dropped: 'เสียหาย/ทำตก',
  other: 'อื่น ๆ',
};

const typeBadgeClass: Record<InventoryTransactionType, string> = {
  restock: 'bg-emerald-50 text-emerald-700',
  adjustment: 'bg-amber-50 text-amber-700',
  waste: 'bg-rose-50 text-rose-600',
};

const selectClass =
  'cursor-pointer rounded-lg border border-[#d9c6b0] bg-white px-2 py-1.5 text-sm transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20';

/** คีย์กลุ่มวัน เช่น "2026-10-22" (เวลาท้องถิ่น) */
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDayHeading = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return `วันนี้ · ${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  if (dayKey(date) === dayKey(yesterday)) return `เมื่อวาน · ${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

export default function InventoryHistory(props: InventoryHistoryProps) {
  const {
    items,
    transactions,
    total,
    offset,
    limit,
    type,
    ingredientId,
    isLoading,
    error,
    setType,
    setIngredientId,
    previousPage,
    nextPage,
  } = props;

  // จับกลุ่มตามวัน (transactions มาใหม่ก่อนอยู่แล้ว — คงลำดับกลุ่มตามที่ได้มา)
  const dayGroups = useMemo(() => {
    const groups: Array<{ key: string; heading: string; date: Date; transactions: InventoryTransaction[] }> = [];
    for (const transaction of transactions) {
      const date = new Date(transaction.created_at);
      const key = dayKey(date);
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.transactions.push(transaction);
      } else {
        groups.push({ key, heading: formatDayHeading(date), date, transactions: [transaction] });
      }
    }
    return groups;
  }, [transactions]);

  return (
    <section className="mt-6 rounded-2xl border border-[#E8DFD5] bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">ประวัติการเคลื่อนไหว</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={ingredientId ?? ''}
            aria-label="กรองตามวัตถุดิบ"
            onChange={(event) => setIngredientId(event.target.value || undefined)}
            className={selectClass}
          >
            <option value="">ทุกวัตถุดิบ</option>
            {items.map((item) => (
              <option key={item.ingredient_id} value={item.ingredient_id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={type ?? ''}
            aria-label="กรองตามประเภท"
            onChange={(event) => setType((event.target.value || undefined) as InventoryTransactionType | undefined)}
            className={selectClass}
          >
            <option value="">ทุกประเภท</option>
            <option value="restock">รับของเข้า</option>
            <option value="adjustment">ปรับจากการนับ</option>
            <option value="waste">ของเสีย</option>
          </select>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : isLoading ? (
        <p className="py-6 text-center text-sm text-stone-500">กำลังโหลดประวัติ...</p>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Inbox className="w-8 h-8 text-stone-300" />
          <p className="text-sm text-stone-500">ยังไม่มีรายการเคลื่อนไหวในเงื่อนไขนี้</p>
        </div>
      ) : (
        <>
          {/* ── กลุ่มตามวัน: หัวข้อวันใหญ่ + รายการเป็นเวลา HH:MM ── */}
          <div className="space-y-5">
            {dayGroups.map((group) => (
              <div key={group.key}>
                <div className="mb-2 flex items-baseline gap-2 border-b border-[#E8DFD5] pb-1.5">
                  <h3 className="text-base font-bold text-[#2D241E]">{group.heading}</h3>
                  <span className="text-xs text-stone-400">{group.transactions.length} รายการ</span>
                </div>
                <ul className="divide-y divide-[#E8DFD5]/60">
                  {group.transactions.map((transaction) => {
                    const transactionDate = new Date(transaction.created_at);
                    return (
                      <li
                        key={transaction.transaction_id}
                        className="flex items-center gap-3 px-1 py-2.5 text-sm transition-colors duration-200 hover:bg-[#FAF7F2]"
                      >
                        <span className="w-14 shrink-0 font-semibold tabular-nums text-stone-500">
                          {formatTime(transactionDate)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{transaction.ingredient_name ?? '-'}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${typeBadgeClass[transaction.type]}`}>
                            {labels[transaction.type]}
                          </span>
                          {transaction.type === 'waste' && transaction.waste_reason && (
                            <span className="text-xs text-stone-500">{reasonLabels[transaction.waste_reason]}</span>
                          )}
                        </span>
                        <span
                          className={`w-24 shrink-0 text-right font-medium ${transaction.quantity_change < 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                        >
                          {transaction.quantity_change > 0 ? '+' : ''}
                          {transaction.quantity_change} {transaction.stock_unit}
                        </span>
                        <span className="hidden w-40 shrink-0 truncate text-right text-xs text-stone-500 md:block">
                          {transaction.note ?? ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#E8DFD5] pt-3 text-sm">
            <span className="text-stone-500">
              {Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} จาก {total}
            </span>
            <button
              type="button"
              disabled={offset === 0}
              onClick={previousPage}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#DECDBB] px-3 py-1.5 text-stone-600 transition-colors duration-200 hover:border-[#8C6D58] hover:text-[#8C6D58] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#DECDBB] disabled:hover:text-stone-600"
            >
              <ChevronLeft className="w-4 h-4" />
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={offset + limit >= total}
              onClick={nextPage}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#DECDBB] px-3 py-1.5 text-stone-600 transition-colors duration-200 hover:border-[#8C6D58] hover:text-[#8C6D58] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#DECDBB] disabled:hover:text-stone-600"
            >
              ถัดไป
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
