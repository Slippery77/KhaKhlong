import { useState } from 'react';
import type { DiningTable } from '../../tables/types/table.types';
import type { Floor, TableFormValues } from '../types/floor.types';

interface Props {
    table?: DiningTable;                                     // มี = โหมดแก้ไข, ไม่มี = โหมดเพิ่ม
    floor: Floor;                                            // ชั้นที่โต๊ะสังกัด (โชว์บนหัว popup)
    onSubmit: (values: TableFormValues) => Promise<boolean>; // true = สำเร็จ → ปิด popup
    onClose: () => void;
    isSubmitting: boolean;
    error: string | null;
}

const MAX_TABLE_NUMBER_LENGTH = 20;
const MAX_CAPACITY = 99;

export default function TableFormPopup({ table, floor, onSubmit, onClose, isSubmitting, error }: Props) {
    const isEdit = table !== undefined;

    const [tableNumber, setTableNumber] = useState(table?.table_number ?? '');
    const [capacity, setCapacity] = useState(String(table?.capacity ?? 4));

    const [touched, setTouched] = useState(false);

    const parsedCapacity = Number(capacity);

    const tableNumberError = tableNumber.trim() === ''
        ? 'กรอกหมายเลขโต๊ะ'
        : tableNumber.trim().length > MAX_TABLE_NUMBER_LENGTH
            ? `หมายเลขโต๊ะยาวเกิน ${MAX_TABLE_NUMBER_LENGTH} ตัวอักษร`
            : null;
    const capacityError = !Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > MAX_CAPACITY
        ? `กรอกจำนวนคนที่นั่งได้เป็นจำนวนเต็ม 1-${MAX_CAPACITY}`
        : null;

    const canSubmit = !tableNumberError && !capacityError && !isSubmitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;

        const ok = await onSubmit({
            table_number: tableNumber.trim(),
            capacity: parsedCapacity,
        });
        if (ok) onClose();
    };

    const showError = (value: string | null) => (touched && value ? value : null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
                <h2 className="mb-1 text-lg font-semibold text-[#2D241E]">
                    {isEdit ? 'แก้ไขโต๊ะ' : 'เพิ่มโต๊ะ'}
                </h2>
                <p className="mb-4 text-xs text-stone-500">
                    ชั้น {floor.floor_no}
                    {floor.name ? ` · ${floor.name}` : ''} · ตั้งไว้ {floor.table_count} โต๊ะ
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        หมายเลขโต๊ะ
                        <input
                            autoFocus
                            value={tableNumber}
                            onChange={e => setTableNumber(e.target.value)}
                            onBlur={() => setTouched(true)}
                            maxLength={MAX_TABLE_NUMBER_LENGTH}
                            autoComplete="off"
                            placeholder="เช่น T01 หรือ 1"
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        <span className="text-xs text-stone-400">ห้ามซ้ำกับโต๊ะอื่นในร้าน</span>
                        {showError(tableNumberError) && (
                            <span className="text-xs text-red-600">{tableNumberError}</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        จำนวนคนที่นั่งได้
                        <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_CAPACITY}
                            value={capacity}
                            onChange={e => setCapacity(e.target.value)}
                            onBlur={() => setTouched(true)}
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        <span className="text-xs text-stone-400">ที่นั่งต่อโต๊ะ (ตั้งแต่ 1 คนขึ้นไป)</span>
                        {showError(capacityError) && (
                            <span className="text-xs text-red-600">{capacityError}</span>
                        )}
                    </label>

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="mt-1 flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 cursor-pointer rounded-xl border border-[#d9c6b0] py-2 text-[#2D241E] transition enabled:hover:bg-[#FAF7F2] enabled:active:scale-95 disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 cursor-pointer rounded-xl bg-[#8C6D58] py-2 font-semibold text-white transition enabled:hover:bg-[#7a5c45] enabled:active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
