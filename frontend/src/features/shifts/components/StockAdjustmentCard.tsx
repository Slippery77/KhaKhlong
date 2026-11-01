import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Package,
  RotateCcw,
  Search,
  SearchX,
} from 'lucide-react';
import { primaryButtonClass, secondaryButtonClass } from '../constants';
import { useStockAdjustment } from '../hooks/useStockAdjustment';

const quantityFormatter = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 4,
});

const formatQuantity = (value: number) => quantityFormatter.format(value);

const countInputClass =
  'w-28 shrink-0 rounded-xl border border-[#d9c6b0] bg-white px-3 py-1.5 text-right text-sm text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 disabled:cursor-not-allowed disabled:bg-[#FAF7F2]';

/** ส่วนต่าง = ยอดนับได้ - ยอดในระบบ (ลบ = ใช้ไป, บวก = นับได้เกิน) */
function DeltaLabel({ delta, unit }: { delta: number | null; unit: string }) {
  if (delta === null) {
    return <span className="text-xs text-[#C4B8AC]">—</span>;
  }
  if (delta === 0) {
    return <span className="text-xs font-medium text-[#3F6B35]">ตรงกัน</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-xs font-medium text-[#C27803]">
        เกิน +{formatQuantity(delta)} {unit}
      </span>
    );
  }
  return (
    <span className="text-xs text-[#6B5140]">
      ใช้ไป {formatQuantity(Math.abs(delta))} {unit}
    </span>
  );
}

type FilterMode = 'all' | 'filled' | 'low';

/**
 * ขั้นตอนปรับวัตถุดิบคงเหลือตอนจบวัน (Periodic Physical Count — INV-11)
 * ยกระดับ UI/UX ตามมาตรฐาน ui-ux-pro-max:
 * - ระบบค้นหาชื่อวัตถุดิบแบบเรียลไทม์
 * - ชิปตัวกรองด่วน: ทั้งหมด / กรอกแล้ว / ใกล้หมด พร้อม badge นับจำนวน
 * - รองรับรอบวันทำการ (business_date) สำหรับร้านที่เปิดข้ามคืน
 * - เคารพสถานะการกรอกของผู้ใช้ไม่ให้สูญหายขณะค้นหาหรือสลับตัวกรอง
 */
export default function StockAdjustmentCard() {
  const {
    items,
    counts,
    setCount,
    clearCounts,
    countedToday,
    businessDate,
    filledCount,
    invalidCount,
    isLoading,
    isSubmitting,
    error,
    result,
    submit,
    reload,
  } = useStockAdjustment();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const lowStockCount = useMemo(
    () => items.filter((item) => item.is_low).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      // 1. ตรวจคำค้นหา
      if (term && !item.name.toLowerCase().includes(term)) {
        return false;
      }
      // 2. ตรวจตัวกรองสถานะ
      if (filterMode === 'filled') {
        const val = counts[item.ingredient_id];
        return val !== undefined && val.trim() !== '';
      }
      if (filterMode === 'low') {
        return item.is_low;
      }
      return true;
    });
  }, [items, searchTerm, filterMode, counts]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterMode('all');
  };

  return (
    <section className="rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-[0_4px_24px_rgba(45,36,30,0.06)]">
      {/* ── ส่วนหัวการ์ด ──────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Package className="mt-0.5 h-5 w-5 shrink-0 text-[#8C6D58]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-[#2D241E]">ปรับวัตถุดิบคงเหลือ</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#7A6A5C]">
              นับของที่เหลือจริงตอนจบวัน ระบบจะคำนวณส่วนต่างที่ใช้ไปให้อัตโนมัติ —
              เว้นช่องว่างไว้ได้ถ้าวัตถุดิบนั้นไม่ได้นับ
            </p>
          </div>
        </div>

        {businessDate && (
          <div className="flex items-center gap-1.5 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-1 text-xs text-[#7A6A5C]">
            <CalendarDays className="h-3.5 w-3.5 text-[#8C6D58]" aria-hidden="true" />
            <span>รอบวันทำการ: <strong>{businessDate}</strong></span>
          </div>
        )}
      </div>

      {/* ── สถานะการตรวจนับวันนี้ ──────────────────────────── */}
      {!isLoading && items.length > 0 && countedToday > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[#3F6B35]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          รอบวันนี้ปรับยอดวัตถุดิบแล้ว {countedToday} รายการ
        </p>
      )}

      {!isLoading && items.length > 0 && countedToday === 0 && !result && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#F0D9A8] bg-[#FFF7E6] px-3 py-2.5">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#C27803]" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-[#8A5A00]">
            รอบวันนี้ยังไม่มีการปรับยอดวัตถุดิบ — ถ้ายังไม่ได้นับของเหลือ ควรนับก่อนปิดกะ
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] px-3 py-2.5 text-xs text-[#B42318]"
        >
          <span className="leading-relaxed">{error}</span>
          <button
            type="button"
            onClick={reload}
            className="shrink-0 cursor-pointer rounded-lg px-2 py-1 font-medium transition-colors duration-200 hover:bg-[#FDE4E1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B42318]/40"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {result && (
        <div role="status" className="mt-4 rounded-xl border border-[#C6DDBC] bg-[#EFF6EC] px-4 py-3">
          <p className="text-sm font-medium text-[#3F6B35]">
            บันทึกการนับแล้ว — ปรับยอด {result.adjusted_count} รายการ
            {result.unchanged_count > 0 && ` · ตรงกัน ${result.unchanged_count} รายการ`}
          </p>
          {result.items.some((item) => item.delta !== 0) && (
            <ul className="mt-2 space-y-1">
              {result.items
                .filter((item) => item.delta !== 0)
                .map((item) => (
                  <li
                    key={item.ingredient_id}
                    className="flex items-center justify-between gap-3 text-xs text-[#4A6B41]"
                  >
                    <span className="min-w-0 truncate">
                      {item.ingredient_name} · นับได้ {formatQuantity(item.counted_quantity)}{' '}
                      {item.stock_unit}
                    </span>
                    <span className="shrink-0">
                      <DeltaLabel delta={item.delta} unit={item.stock_unit} />
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] py-10 text-sm text-[#7A6A5C]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          กำลังโหลดรายการวัตถุดิบ…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#d9c6b0] bg-[#FAF7F2] px-4 py-8 text-center">
          <p className="text-sm text-[#7A6A5C]">ยังไม่มีวัตถุดิบที่ใช้งานอยู่</p>
          <p className="mt-1 text-xs text-[#9B8E82]">
            เพิ่มวัตถุดิบได้ที่เมนูสต็อกก่อน แล้วกลับมานับที่นี่
          </p>
        </div>
      ) : (
        <>
          {/* ── ช่องค้นหา + ตัวกรองด่วน (UI/UX Pro Max) ──────────── */}
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* กล่องค้นหา */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B8E82]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาชื่อวัตถุดิบ..."
                aria-label="ค้นหาวัตถุดิบที่ต้องการนับ"
                className="w-full rounded-xl border border-[#d9c6b0] bg-white py-1.5 pl-9 pr-8 text-sm text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-[#9B8E82] transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40"
                >
                  <SearchX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* ชิปตัวกรองด่วน */}
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="กรองรายการวัตถุดิบ">
              <button
                type="button"
                role="tab"
                aria-selected={filterMode === 'all'}
                onClick={() => setFilterMode('all')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 ${
                  filterMode === 'all'
                    ? 'border-[#8C6D58] bg-[#8C6D58] text-white shadow-sm'
                    : 'border-[#E8DFD5] bg-[#FAF7F2] text-[#7A6A5C] hover:border-[#d9c6b0] hover:bg-[#F5EFE6]'
                }`}
              >
                <span>ทั้งหมด</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    filterMode === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#E8DFD5] text-[#6B5140]'
                  }`}
                >
                  {items.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={filterMode === 'filled'}
                onClick={() => setFilterMode('filled')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 ${
                  filterMode === 'filled'
                    ? 'border-[#8C6D58] bg-[#8C6D58] text-white shadow-sm'
                    : 'border-[#E8DFD5] bg-[#FAF7F2] text-[#7A6A5C] hover:border-[#d9c6b0] hover:bg-[#F5EFE6]'
                }`}
              >
                <span>กรอกแล้ว</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    filterMode === 'filled'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#E8DFD5] text-[#6B5140]'
                  }`}
                >
                  {filledCount}
                </span>
              </button>

              {lowStockCount > 0 && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterMode === 'low'}
                  onClick={() => setFilterMode('low')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 ${
                    filterMode === 'low'
                      ? 'border-[#C27803] bg-[#C27803] text-white shadow-sm'
                      : 'border-[#F0D9A8] bg-[#FFF7E6] text-[#8A5A00] hover:border-[#C27803]'
                  }`}
                >
                  <span>ใกล้หมด</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      filterMode === 'low'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F0D9A8] text-[#8A5A00]'
                    }`}
                  >
                    {lowStockCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ── ลิสต์รายการวัตถุดิบ ──────────────────────────── */}
          {filteredItems.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d9c6b0] bg-[#FAF7F2] px-4 py-8 text-center">
              <SearchX className="h-6 w-6 text-[#9B8E82]" aria-hidden="true" />
              <p className="text-sm text-[#7A6A5C]">ไม่พบวัตถุดิบที่ตรงกับคำค้นหาหรือตัวกรอง</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-1 cursor-pointer text-xs font-medium text-[#8C6D58] underline hover:text-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40"
              >
                ล้างการค้นหาและตัวกรอง
              </button>
            </div>
          ) : (
            <ul className="mt-3 max-h-[420px] divide-y divide-[#F1EAE1] overflow-y-auto rounded-xl border border-[#E8DFD5]">
              {filteredItems.map((item) => {
                const raw = counts[item.ingredient_id] ?? '';
                const parsed = raw.trim() === '' ? null : Number(raw);
                const delta =
                  parsed === null || Number.isNaN(parsed) ? null : parsed - item.current_stock;

                return (
                  <li
                    key={item.ingredient_id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors hover:bg-[#FAF7F2]/60"
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate text-sm font-medium text-[#2D241E]">{item.name}</p>
                      <p className="mt-0.5 text-xs text-[#9B8E82]">
                        คงเหลือในระบบ {formatQuantity(item.current_stock)} {item.stock_unit}
                        {item.is_low && <span className="ml-1.5 font-medium text-[#C27803]">· ใกล้หมด</span>}
                      </p>
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.0001"
                      value={raw}
                      onChange={(event) => setCount(item.ingredient_id, event.target.value)}
                      placeholder="ไม่ปรับ"
                      aria-label={`ยอดนับจริงของ ${item.name} (${item.stock_unit})`}
                      className={countInputClass}
                      disabled={isSubmitting}
                    />
                    <span className="w-28 shrink-0 text-right">
                      <DeltaLabel delta={delta} unit={item.stock_unit} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── แถบสรุปผลด้านล่าง ────────────────────────────── */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#7A6A5C]">
              แสดง {filteredItems.length} จากทั้งหมด {items.length} รายการ · กรอกแล้ว {filledCount} รายการ (เว้นว่าง = ไม่ปรับยอด)
            </p>
            {filledCount > 0 && (
              <button
                type="button"
                onClick={clearCounts}
                disabled={isSubmitting}
                className={`${secondaryButtonClass} px-3 py-1.5 text-xs`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                ล้างที่กรอกทั้งหมด
              </button>
            )}
          </div>

          {invalidCount > 0 && (
            <p role="alert" className="mt-2 text-xs text-[#B42318]">
              มี {invalidCount} ช่องที่กรอกไม่ถูกต้อง — ต้องเป็นตัวเลข 0 ขึ้นไป
            </p>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={filledCount === 0 || invalidCount > 0 || isSubmitting}
            className={`${primaryButtonClass} mt-3`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Package className="h-4 w-4" aria-hidden="true" />
            )}
            บันทึกการนับ{filledCount > 0 ? ` (${filledCount} รายการ)` : ''}
          </button>
        </>
      )}
    </section>
  );
}
