import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import { useTables } from '../hooks/useTables'
import TableCard from '../components/TableCard'
import type { DiningTable } from '../types/table.types'
import { useAuth } from '../../auth/context/AuthContext'
import { RefreshCw } from 'lucide-react'

// จัดกลุ่มโต๊ะตามชั้น (floor_no มาจาการ JOIN floors — null แปลว่าชั้นถูกลบไปแล้ว ให้ไป"group อื่น")
function groupByFloor(tables: DiningTable[]): Map<number, DiningTable[]> {
    const map = new Map<number, DiningTable[]>()
    for (const t of tables) {
        const group = map.get(t.floor_no ?? -1) ?? []
        group.push(t)
        map.set(t.floor_no ?? -1, group)
    }
    return map
}

export default function TablesPage() {
    const { tables, isLoading, error, reload } = useTables()
    const navigate = useNavigate()
    const { user } = useAuth()
    // null = แสดงทุกชั้น, ตัวเลข = แสดงเฉพาะชั้นที่เลือกจาก sidebar
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null)

    const occupiedCount = tables.filter((t) => t.status === 'occupied').length
    const floors = groupByFloor(tables)
    // ชั้นที่จะแสดง = ชั้นที่เลือกไว้ หรือทุกชั้นถ้าไม่ได้เลือก
    const visibleFloors = selectedFloor === null
        ? Array.from(floors.entries())
        : Array.from(floors.entries()).filter(([floor]) => floor === selectedFloor)
    const visibleTables = visibleFloors.flatMap(([, floorTables]) => floorTables)
    const visibleOccupied = visibleTables.filter((t) => t.status === 'occupied').length

    function handleTableClick(table: DiningTable) {
        // ส่ง tableId และ tableName ไปหน้า POS ผ่าน URL query params
        navigate(
            `/${user?.tenantSlug}/mainpos?tableId=${table.table_id}&tableName=${encodeURIComponent(table.table_number)}${
                table.open_order_id ? `&orderId=${table.open_order_id}` : ''
            }`,
        )
    }

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF7F2]">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar ชั้น */}
                <aside className="w-30 shrink-0 bg-[#F3EDE4] border-r border-stone-200 flex flex-col items-center py-4 gap-2 overflow-y-auto">
                    {/* ปุ่ม "ทั้งหมด" — กลับมาแสดงโต๊ะทุกชั้น */}
                    <button
                        type="button"
                        onClick={() => setSelectedFloor(null)}
                        className={`w-16 rounded-xl transition-all py-2 px-1 text-center cursor-pointer ${
                            selectedFloor === null
                                ? 'bg-[#8C6D58] hover:bg-[#7a5c45] active:scale-95'
                                : 'bg-[#EDE3D6] hover:bg-[#E4D6C4] active:scale-95'
                        }`}
                    >
                        <p className={`text-[11px] font-semibold ${selectedFloor === null ? 'text-[#FAF7F2]' : 'text-[#5C3D1E]'}`}>
                            ทั้งหมด
                        </p>
                        <p className={`text-[10px] mt-0.5 ${selectedFloor === null ? 'text-[#E8DFD5]' : 'text-[#8C6D58]'}`}>
                            {tables.length} โต๊ะ
                        </p>
                    </button>

                    {Array.from(floors.keys()).map((floor) => {
                        const floorTables = floors.get(floor)!
                        const occupied = floorTables.filter((t) => t.status === 'occupied').length
                        const isActive = selectedFloor === floor
                        return (
                            <button
                                key={floor}
                                type="button"
                                onClick={() => setSelectedFloor(floor)}
                                className={`w-16 rounded-xl transition-all py-2 px-1 text-center cursor-pointer ${
                                    isActive
                                        ? 'bg-[#8C6D58] hover:bg-[#7a5c45] active:scale-95'
                                        : 'bg-[#EDE3D6] hover:bg-[#E4D6C4] active:scale-95'
                                }`}
                            >
                                <p className={`text-[11px] font-semibold ${isActive ? 'text-[#FAF7F2]' : 'text-[#5C3D1E]'}`}>
                                    ชั้น {floor}
                                </p>
                                <p className={`text-[10px] mt-0.5 ${isActive ? 'text-[#E8DFD5]' : 'text-[#8C6D58]'}`}>
                                    {occupied}/{floorTables.length} โต๊ะ
                                </p>
                            </button>
                        )
                    })}

                    {/* สรุปโต๊ะที่มีลูกค้าทั้งหมด */}
                    <div className="mt-auto w-16 rounded-xl bg-[#EDE3D6] py-2 px-1 text-center">
                        <p className="text-[10px] text-[#8C6D58]">มีลูกค้า</p>
                        <p className="text-lg font-bold text-[#5C3D1E] leading-tight">{occupiedCount}</p>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {/* Header โต๊ะ */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-lg font-bold text-[#2D241E] font-kanit">ผังโต๊ะ</h1>
                            {!isLoading && !error && (
                                <p className="text-sm text-stone-400 font-kanit mt-0.5">
                                    {selectedFloor === null
                                        ? `${tables.length} โต๊ะ · มีลูกค้า ${occupiedCount} โต๊ะ`
                                        : `ชั้น ${selectedFloor} · ${visibleTables.length} โต๊ะ · มีลูกค้า ${visibleOccupied} โต๊ะ`}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={reload}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-500 hover:bg-stone-100 active:scale-95 transition-all font-kanit cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>รีเฟรช</span>
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <p className="text-sm text-stone-400 font-kanit">กำลังโหลดข้อมูลโต๊ะ...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-3 py-20 font-kanit">
                            <p className="text-sm text-red-600">{error}</p>
                            <button
                                type="button"
                                onClick={reload}
                                className="rounded-xl border border-[#d9c6b0] px-4 py-2 text-sm text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-95"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 font-kanit">
                            <p className="text-sm text-stone-400">ยังไม่มีโต๊ะ กรุณาเพิ่มโต๊ะในหน้าตั้งค่าก่อน</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {visibleFloors.map(([floor, floorTables]) => {
                                // แยกโต๊ะมีลูกค้าขึ้นก่อน เพื่อให้เป็นแถว/กลุ่มต่างหากจากโต๊ะว่าง
                                const occupiedTables = floorTables.filter((t) => t.status === 'occupied')
                                const freeTables = floorTables.filter((t) => t.status !== 'occupied')
                                return (
                                    <section key={floor} id={`floor-${floor}`}>
                                        <h2 className="text-sm font-semibold text-stone-400 font-kanit mb-3">
                                            ชั้น {floor} — {floorTables.length} โต๊ะ
                                        </h2>

                                        {/* โต๊ะที่มีลูกค้า */}
                                        {occupiedTables.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-xs font-semibold text-[#A0732E] font-kanit mb-2">
                                                    มีลูกค้า ({occupiedTables.length})
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-stretch">
                                                    {occupiedTables.map((table) => (
                                                        <TableCard
                                                            key={table.table_id}
                                                            table={table}
                                                            onClick={handleTableClick}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* โต๊ะว่าง + ปิดใช้งาน */}
                                        {freeTables.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-stone-400 font-kanit mb-2">
                                                    ว่าง ({freeTables.length})
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-stretch">
                                                    {freeTables.map((table) => (
                                                        <TableCard
                                                            key={table.table_id}
                                                            table={table}
                                                            onClick={handleTableClick}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
