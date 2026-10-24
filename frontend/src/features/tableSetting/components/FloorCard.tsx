import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import type { Floor } from '../types/floor.types';

interface Props {
    floor: Floor;
    canManage: boolean;                         // false = พนักงานดูอย่างเดียว
    onOpen: (floor: Floor) => void;             // เข้าไปดู/เพิ่มโต๊ะในชั้นนี้
    onEdit: (floor: Floor) => void;
    onDelete: (floor: Floor) => void;
}

export default function FloorCard({ floor, canManage, onOpen, onEdit, onDelete }: Props) {
    // ผลต่างระหว่าง "ตั้งไว้" กับ "มีจริง" — ให้รู้ว่าเหลืออีกกี่ตัวตามแผน
    const diff = floor.table_count - floor.actual_table_count;

    return (
        <div
            onClick={() => onOpen(floor)}
            className="group cursor-pointer rounded-2xl border border-[#E8DFD5] bg-white p-5 transition hover:border-[#8C6D58] hover:shadow-sm"
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-[#2D241E]">ชั้น {floor.floor_no}</span>
                        {floor.name && (
                            <span className="rounded-full bg-[#EFE8DC] px-2 py-0.5 text-xs text-[#8C6D58]">
                                {floor.name}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                        ตั้งไว้ {floor.table_count} โต๊ะ · มีจริง {floor.actual_table_count} โต๊ะ
                    </p>
                </div>

                <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        floor.actual_table_count === 0
                            ? 'bg-stone-100 text-stone-500'
                            : diff > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                    }`}
                >
                    {floor.actual_table_count === 0
                        ? 'ยังไม่มีโต๊ะ'
                        : diff > 0
                            ? `เหลืออีก ${diff} ตัว`
                            : diff < 0
                                ? `เกินแผน ${Math.abs(diff)} ตัว`
                                : 'ครบตามแผน'}
                </span>
            </div>

            <div className="flex items-center justify-between border-t border-[#F0EAE2] pt-3">
                <span className="text-sm font-medium text-[#8C6D58] transition group-hover:text-[#7a5c45]">
                    จัดการโต๊ะ
                </span>

                <div className="flex items-center gap-1">
                    {canManage && (
                        <>
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onEdit(floor); }}
                                title="แก้ไขชั้น"
                                className="cursor-pointer rounded-lg p-1.5 text-stone-500 transition hover:bg-[#FAF7F2] hover:text-[#8C6D58]"
                            >
                                <Pencil size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onDelete(floor); }}
                                title="ลบชั้น"
                                className="cursor-pointer rounded-lg p-1.5 text-stone-500 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                                <Trash2 size={15} />
                            </button>
                        </>
                    )}
                    <ArrowRight size={16} className="text-stone-400 transition group-hover:text-[#8C6D58]" />
                </div>
            </div>
        </div>
    );
}
