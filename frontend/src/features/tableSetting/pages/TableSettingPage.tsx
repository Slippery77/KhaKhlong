import { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import ConfirmDialog from '../../users/components/ConfirmDialog';
import { useAuth } from '../../auth/context/AuthContext';
import { useFloorsList, useFloorActions } from '../hooks/useFloors';
import FloorCard from '../components/FloorCard';
import FloorFormPopup from '../components/FloorFormPopup';
import TableFormPopup from '../components/TableFormPopup';
import { TABLE_STATUS_LABEL } from '../types/floor.types';
import type { Floor, FloorFormValues, TableFormValues } from '../types/floor.types';

// สีของป้ายสถานะโต๊ะ (ตัวเดียวกับหน้าผังโต๊ะ)
const STATUS_BADGE: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-800',
    occupied: 'bg-amber-100 text-amber-800',
    out_of_service: 'bg-stone-200 text-stone-600',
};

function FloorCardSkeleton() {
    return (
        <div className="h-44 rounded-2xl border border-[#E8DFD5] bg-white p-5 shadow-xs" aria-busy="true">
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-24 rounded-md bg-stone-200/70 animate-pulse" />
                <div className="h-6 w-16 rounded-full bg-stone-200/60 animate-pulse" />
            </div>
            <div className="h-4 w-36 rounded-md bg-stone-200/50 animate-pulse mb-6" />
            <div className="flex items-center justify-between pt-3 border-t border-[#F0EAE2]">
                <div className="h-4 w-20 rounded-md bg-stone-200/50 animate-pulse" />
                <div className="h-8 w-16 rounded-xl bg-stone-200/60 animate-pulse" />
            </div>
        </div>
    );
}

export default function TableSettingPage() {
    const { floors, tables, isLoading, error, reload } = useFloorsList();
    const actions = useFloorActions();
    const { user: currentUser } = useAuth();

    // owner กับ manager มีสิทธิ์ table:manage — พนักงานดูอย่างเดียว
    const canManage = currentUser?.role === 'owner' || currentUser?.role === 'manager';

    // view หลัก = รายการชั้น, ถ้าเลือกชั้นไว้จะเปลี่ยนเป็นหน้าชั้นนั้น
    const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

    const [showFloorForm, setShowFloorForm] = useState(false);
    const [editingFloor, setEditingFloor] = useState<Floor | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<Floor | null>(null);

    const [showTableForm, setShowTableForm] = useState(false);
    const [editingTable, setEditingTable] = useState<string | undefined>(undefined); // table_id

    const hasData = floors.length > 0;
    const isInitialLoading = isLoading && !hasData;

    const selectedFloor = floors.find(f => f.floor_id === selectedFloorId) ?? null;
    const floorTables = useMemo(() => {
        if (!selectedFloor) return [];
        const collator = new Intl.Collator('th-TH', { numeric: true, sensitivity: 'base' });
        return tables
            .filter(t => t.floor_id === selectedFloor.floor_id)
            .sort((a, b) => collator.compare(a.table_number, b.table_number));
    }, [tables, selectedFloor]);
    const editingTableRow = floorTables.find(t => t.table_id === editingTable);

    const nextFloorNo = floors.length > 0 ? Math.max(...floors.map(f => f.floor_no)) + 1 : 1;

    // ---------- จัดการชั้น ----------
    const openCreateFloor = () => {
        actions.clearError();
        setEditingFloor(undefined);
        setShowFloorForm(true);
    };

    const openEditFloor = (floor: Floor) => {
        actions.clearError();
        setEditingFloor(floor);
        setShowFloorForm(true);
    };

    const handleFloorSubmit = async (values: FloorFormValues) => {
        const ok = editingFloor
            ? await actions.updateFloor(editingFloor.floor_id, values)
            : await actions.createFloor(values);
        if (ok) await reload(true);
        return ok;
    };

    const handleDeleteFloor = async () => {
        if (!deleteTarget) return;
        const ok = await actions.deleteFloor(deleteTarget.floor_id);
        if (ok) {
            if (selectedFloorId === deleteTarget.floor_id) setSelectedFloorId(null);
            await reload(true);
        }
        setDeleteTarget(null);
    };

    // ---------- จัดการโต๊ะในชั้น ----------
    const openCreateTable = () => {
        actions.clearError();
        setEditingTable(undefined);
        setShowTableForm(true);
    };

    const openEditTable = (tableId: string) => {
        actions.clearError();
        setEditingTable(tableId);
        setShowTableForm(true);
    };

    const handleTableSubmit = async (values: TableFormValues) => {
        if (!selectedFloor) return false;
        const ok = editingTableRow
            ? await actions.updateTable(editingTableRow.table_id, values)
            : await actions.createTable(selectedFloor.floor_id, values);
        if (ok) await reload(true);
        return ok;
    };

    return (
        <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6 font-kanit">
            {/* ============ หน้าชั้น (ดู/เพิ่ม/แก้ไขโต๊ะ) ============ */}
            {selectedFloor ? (
                <>
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <button
                                type="button"
                                onClick={() => setSelectedFloorId(null)}
                                className="mb-2 flex cursor-pointer items-center gap-1 text-sm text-stone-500 transition hover:text-[#8C6D58]"
                            >
                                <ArrowLeft size={15} />
                                กลับไปรายการชั้น
                            </button>

                            <h1 className="text-2xl font-semibold text-[#2D241E]">
                                ชั้น {selectedFloor.floor_no}
                                {selectedFloor.name && (
                                    <span className="ml-2 text-lg font-normal text-stone-500">
                                        {selectedFloor.name}
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm text-stone-500">
                                ตั้งไว้ {selectedFloor.table_count} โต๊ะ · มีจริง {floorTables.length} โต๊ะ
                            </p>
                        </div>

                        {canManage && (
                            <button
                                type="button"
                                onClick={openCreateTable}
                                className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#8C6D58] px-4 py-2 font-semibold text-white transition hover:bg-[#7a5c45] active:scale-95"
                            >
                                <Plus size={18} />
                                เพิ่มโต๊ะ
                            </button>
                        )}
                    </div>

                    {actions.error && <p className="mb-3 text-sm text-red-600">{actions.error}</p>}

                    {floorTables.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#d9c6b0] bg-white/60 p-12 text-center">
                            <p className="text-sm text-stone-500">
                                ยังไม่มีโต๊ะในชั้นนี้
                                {canManage && ' — กด "เพิ่มโต๊ะ" เพื่อใส่หมายเลขโต๊ะและจำนวนที่นั่ง'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-[#E8DFD5] bg-white">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-[#E8DFD5] text-stone-500">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">ลำดับ</th>
                                        <th className="px-4 py-3 font-medium">หมายเลขโต๊ะ</th>
                                        <th className="px-4 py-3 font-medium">จำนวนคนที่นั่งได้</th>
                                        <th className="px-4 py-3 font-medium">สถานะ</th>
                                        {canManage && <th className="px-4 py-3 text-right font-medium">จัดการ</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {floorTables.map((table, index) => (
                                        <tr key={table.table_id} className="border-b border-[#F0EAE2] last:border-0">
                                            <td className="px-4 py-3 text-stone-400">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium text-[#2D241E]">
                                                {table.table_number}
                                            </td>
                                            <td className="px-4 py-3 text-stone-600">{table.capacity} ที่นั่ง</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        STATUS_BADGE[table.status] ?? 'bg-stone-100 text-stone-600'
                                                    }`}
                                                >
                                                    {TABLE_STATUS_LABEL[table.status] ?? table.status}
                                                </span>
                                            </td>
                                            {canManage && (
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditTable(table.table_id)}
                                                        disabled={actions.isSubmitting}
                                                        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-stone-600 transition enabled:hover:bg-[#FAF7F2] enabled:hover:text-[#8C6D58] disabled:opacity-50"
                                                    >
                                                        แก้ไข
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                /* ============ หน้ารายการชั้น ============ */
                <>
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-[#2D241E]">ตั้งค่าโต๊ะ</h1>
                            <p className="text-sm text-stone-500">
                                {isInitialLoading ? (
                                    'กำลังโหลดข้อมูลชั้นและโต๊ะ...'
                                ) : hasData ? (
                                    `ทั้งหมด ${floors.length} ชั้น · โต๊ะทั้งร้าน ${tables.length} ตัว`
                                ) : (
                                    'ขั้นแรกเพิ่มชั้น แล้วค่อยเข้าไปเพิ่มโต๊ะทีละตัว'
                                )}
                            </p>
                        </div>

                        {canManage && (
                            <button
                                type="button"
                                disabled={isInitialLoading}
                                onClick={openCreateFloor}
                                className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#8C6D58] px-4 py-2 font-semibold text-white transition hover:bg-[#7a5c45] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={18} />
                                เพิ่มชั้น
                            </button>
                        )}
                    </div>

                    {/* ข้อผิดพลาด */}
                    {error && !hasData && (
                        <div className="mb-6 flex max-w-xl items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-xs">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => reload(false)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-50 transition active:scale-95"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                ลองใหม่
                            </button>
                        </div>
                    )}
                    {actions.error && <p className="mb-3 text-sm text-red-600">{actions.error}</p>}

                    {/* โหลดครั้งแรก: แสดง Skeleton ชั้น ไม่ทำให้จอกระพริบ */}
                    {isInitialLoading ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="กำลังโหลดข้อมูลชั้นและโต๊ะ">
                            {[1, 2, 3].map((i) => (
                                <FloorCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : floors.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#d9c6b0] bg-white/60 p-12 text-center">
                            <p className="text-sm text-stone-500">
                                ยังไม่มีชั้นในร้าน
                                {canManage && ' — กด "เพิ่มชั้น" เพื่อเริ่มตั้งค่าผังโต๊ะ'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {floors.map(floor => (
                                <FloorCard
                                    key={floor.floor_id}
                                    floor={floor}
                                    canManage={canManage}
                                    onOpen={f => setSelectedFloorId(f.floor_id)}
                                    onEdit={openEditFloor}
                                    onDelete={setDeleteTarget}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ---------- popup ฟอร์มชั้น ---------- */}
            {showFloorForm && (
                <FloorFormPopup
                    floor={editingFloor}
                    defaultFloorNo={nextFloorNo}
                    onSubmit={handleFloorSubmit}
                    onClose={() => setShowFloorForm(false)}
                    isSubmitting={actions.isSubmitting}
                    error={actions.error}
                />
            )}

            {/* ---------- popup ฟอร์มโต๊ะ (ต้องมีชั้นที่เลือกไว้) ---------- */}
            {showTableForm && selectedFloor && (
                <TableFormPopup
                    table={editingTableRow}
                    floor={selectedFloor}
                    onSubmit={handleTableSubmit}
                    onClose={() => setShowTableForm(false)}
                    isSubmitting={actions.isSubmitting}
                    error={actions.error}
                />
            )}

            {/* ---------- ยืนยันการลบชั้น ---------- */}
            {deleteTarget && (
                <ConfirmDialog
                    title="ลบชั้น"
                    message={
                        deleteTarget.actual_table_count > 0
                            ? `ชั้น ${deleteTarget.floor_no} ยังมีโต๊ะอยู่ ${deleteTarget.actual_table_count} ตัว — ย้ายโต๊ะไปชั้นอื่นให้หมดก่อนจึงจะลบได้`
                            : `ชั้น ${deleteTarget.floor_no}${deleteTarget.name ? ` (${deleteTarget.name})` : ''} จะถูกลบออกจากร้าน`
                    }
                    confirmLabel="ลบชั้น"
                    danger
                    isSubmitting={actions.isSubmitting}
                    onConfirm={handleDeleteFloor}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </main>
    );
}
