import { useState } from 'react';
import type { Floor, FloorFormValues } from '../types/floor.types';

interface Props {
    floor?: Floor;                                        // มี = โหมดแก้ไข, ไม่มี = โหมดเพิ่ม
    defaultFloorNo: number;                               // เลขชั้นที่แนะนำตอนเพิ่ม (ชั้นล่าสุด + 1)
    onSubmit: (values: FloorFormValues) => Promise<boolean>; // true = สำเร็จ → ปิด popup
    onClose: () => void;
    isSubmitting: boolean;
    error: string | null;
}

export default function FloorFormPopup({ floor, defaultFloorNo, onSubmit, onClose, isSubmitting, error }: Props) {
    const isEdit = floor !== undefined;

    const [floorNo, setFloorNo] = useState(String(floor?.floor_no ?? defaultFloorNo));
    const [name, setName] = useState(floor?.name ?? '');
    const [tableCount, setTableCount] = useState(String(floor?.table_count ?? 0));

    // ตรวจในฟอร์มก่อนยิง API — ข้อความภาษาไทยเข้าใจง่ายกว่า error จาก server
    const [touched, setTouched] = useState(false);

    const parsedFloorNo = Number(floorNo);
    const parsedTableCount = Number(tableCount);

    const floorNoError = floorNo.trim() === '' || !Number.isInteger(parsedFloorNo) || parsedFloorNo < 1
        ? 'กรอกเลขชั้นเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป'
        : null;
    const tableCountError = tableCount.trim() === '' || !Number.isInteger(parsedTableCount) || parsedTableCount < 0
        ? 'กรอกจำนวนโต๊ะเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป'
        : null;
    const nameError = name.trim().length > 50 ? 'ชื่อชั้นยาวเกิน 50 ตัวอักษร' : null;

    const canSubmit = !floorNoError && !tableCountError && !nameError && !isSubmitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;

        const ok = await onSubmit({
            floor_no: parsedFloorNo,
            name: name.trim(),
            table_count: parsedTableCount,
        });
        if (ok) onClose();
    };

    const showError = (value: string | null) => (touched && value ? value : null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
                <h2 className="mb-1 text-lg font-semibold text-[#2D241E]">
                    {isEdit ? 'แก้ไขชั้น' : 'เพิ่มชั้น'}
                </h2>
                <p className="mb-4 text-xs text-stone-500">
                    {isEdit
                        ? 'แก้ไขได้เฉพาะข้อมูลชั้น โต๊ะที่อยู่ในชั้นจะไม่ถูกกระทบ เพราะผูกด้วย floor_id'
                        : 'ขั้นแรกของการตั้งค่าโต๊ะคือเพิ่มชั้นให้เสร็จก่อน แล้วค่อยเข้าไปเพิ่มโต๊ะทีละตัว'}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        เลขชั้น
                        <input
                            autoFocus
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={floorNo}
                            onChange={e => setFloorNo(e.target.value)}
                            onBlur={() => setTouched(true)}
                            placeholder="เช่น 1"
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        {showError(floorNoError) && (
                            <span className="text-xs text-red-600">{floorNoError}</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        ชื่อชั้น (ไม่บังคับ)
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={() => setTouched(true)}
                            maxLength={50}
                            placeholder="เช่น ชั้นล่าง / ชั้นบน"
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        <span className="text-xs text-stone-400">เว้นว่างไว้ก็ได้ ระบบจะแสดงแค่เลขชั้น</span>
                        {showError(nameError) && (
                            <span className="text-xs text-red-600">{nameError}</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        จำนวนโต๊ะ (ที่ตั้งไว้)
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={tableCount}
                            onChange={e => setTableCount(e.target.value)}
                            onBlur={() => setTouched(true)}
                            placeholder="เช่น 5"
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        <span className="text-xs text-stone-400">
                            เป็นจำนวนเป้าหมาย ระบบไม่สร้างโต๊ะให้อัตโนมัติ — เพิ่มทีละตัวในหน้าชั้น
                        </span>
                        {showError(tableCountError) && (
                            <span className="text-xs text-red-600">{tableCountError}</span>
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
