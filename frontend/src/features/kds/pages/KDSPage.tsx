import { useState } from "react"
import Header from "../../../components/Header"
import KDSCard from "../components/KDSCard"
import { useKDS } from "../context/KDSContext"
import type { KDSStatus } from "../types/kds.types"
import { ChefHat, Bell, CheckCircle2, CookingPot, HelpCircle, X, RefreshCw } from "lucide-react"

export default function KDSPage() {
    const {
        orders,
        updateOrderStatus,
        cancelOrder,
        completeOrder,
        clearAllOrders,
    } = useKDS()

    // State สำหรับการกรองสถานะ (null หมายถึงแสดงทั้งหมดตามรูป mockup 2)
    const [filterStatus, setFilterStatus] = useState<KDSStatus | null>(null)
    const [showHelpModal, setShowHelpModal] = useState(false)

    // แยกออเดอร์ตามสถานะทั้ง 3
    const pendingOrders = orders.filter((o) => o.status === "รอทำ")
    const cookingOrders = orders.filter((o) => o.status === "กำลังทำ")
    const readyOrders = orders.filter((o) => o.status === "พร้อมเสิร์ฟ")

    const totalOrdersCount = orders.length

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF7F2] font-kanit">
            {/* Header ด้านบนสุด */}
            <Header />

            {/* แถบหัวเรื่อง Kitchen Display และแท็บสถานะสรุปด้านขวา */}
            <div className="h-14 border-b border-stone-200/80 px-8 flex items-center justify-between bg-[#F4EFE6]/80 shrink-0">
                <div className="flex items-center gap-2.5">
                    <ChefHat className="w-5 h-5 text-[#8C6D58] stroke-[2]" />
                    <h1 className="text-base font-semibold text-[#2D241E]">Kitchen Display</h1>
                </div>

                {/* เมื่อไม่มีออเดอร์ หรือมีออเดอร์จะแสดง Badge ตามรูป screenshot */}
                <div className="flex items-center gap-2">
                    {totalOrdersCount === 0 ? (
                        <span className="text-sm text-stone-500 font-normal">ไม่มีออเดอร์รอ</span>
                    ) : (
                        <div className="flex items-center gap-2 select-none">
                            {filterStatus && (
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus(null)}
                                    className="text-xs px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 hover:bg-stone-300 transition-all cursor-pointer font-medium"
                                >
                                    แสดงทั้งหมด ({totalOrdersCount})
                                </button>
                            )}

                            {/* Badge รอทำ */}
                            <button
                                type="button"
                                onClick={() =>
                                    setFilterStatus(filterStatus === "รอทำ" ? null : "รอทำ")
                                }
                                className={`text-xs px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                    filterStatus === "รอทำ" ? "ring-2 ring-offset-1 ring-[#C27803]" : ""
                                } bg-[#C27803] text-white hover:brightness-105 active:scale-95`}
                                title="คลิกเพื่อกรองเฉพาะออเดอร์ที่รอทำ"
                            >
                                รอทำ {pendingOrders.length}
                            </button>

                            {/* Badge กำลังทำ */}
                            <button
                                type="button"
                                onClick={() =>
                                    setFilterStatus(filterStatus === "กำลังทำ" ? null : "กำลังทำ")
                                }
                                className={`text-xs px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                    filterStatus === "กำลังทำ"
                                        ? "ring-2 ring-offset-1 ring-[#3B75A6]"
                                        : ""
                                } bg-[#3B75A6] text-white hover:brightness-105 active:scale-95`}
                                title="คลิกเพื่อกรองเฉพาะออเดอร์ที่กำลังทำ"
                            >
                                กำลังทำ {cookingOrders.length}
                            </button>

                            {/* Badge พร้อมเสิร์ฟ */}
                            <button
                                type="button"
                                onClick={() =>
                                    setFilterStatus(filterStatus === "พร้อมเสิร์ฟ" ? null : "พร้อมเสิร์ฟ")
                                }
                                className={`text-xs px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                    filterStatus === "พร้อมเสิร์ฟ"
                                        ? "ring-2 ring-offset-1 ring-[#2E7D4E]"
                                        : ""
                                } bg-[#2E7D4E] text-white hover:brightness-105 active:scale-95`}
                                title="คลิกเพื่อกรองเฉพาะออเดอร์ที่พร้อมเสิร์ฟ"
                            >
                                พร้อมเสิร์ฟ {readyOrders.length}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* เนื้อหาหลักของหน้า KDS */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                {totalOrdersCount === 0 ? (
                    /* รูปแบบเมื่อไม่มีออเดอร์ในครัว (ตรงตาม Screenshot 1 เป๊ะ) */
                    <div className="h-full flex flex-col items-center justify-center text-center select-none py-12">
                        <div className="w-20 h-20 rounded-full bg-[#EFE8DC]/50 flex items-center justify-center mb-4 text-[#A89887]">
                            <ChefHat className="w-10 h-10 stroke-[1.25]" />
                        </div>
                        <h2 className="text-base font-semibold text-[#44382D]">ไม่มีออเดอร์ในครัว</h2>
                        <p className="text-sm text-stone-400 mt-1 max-w-sm">
                            ออเดอร์จากหน้า POS จะแสดงที่นี่
                        </p>
                    </div>
                ) : (
                    /* รูปแบบเมื่อมีออเดอร์ แบ่งเป็น 3 ส่วน (ตรงตาม Screenshot 2) */
                    <div className="flex flex-col gap-8 pb-12">
                        {/* 1. ส่วน: รอทำ */}
                        {(!filterStatus ? pendingOrders.length > 0 : filterStatus === "รอทำ") && (
                            <section className="flex flex-col gap-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C27803] text-white text-xs font-semibold">
                                        <Bell className="w-3.5 h-3.5 stroke-[2]" />
                                        <span>รอทำ</span>
                                    </div>
                                    <span className="text-xs text-stone-500 font-medium">
                                        {pendingOrders.length} ออเดอร์
                                    </span>
                                </div>

                                {pendingOrders.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {pendingOrders.map((order) => (
                                            <KDSCard
                                                key={order.id}
                                                order={order}
                                                onUpdateStatus={updateOrderStatus}
                                                onCancelOrder={cancelOrder}
                                                onCompleteOrder={completeOrder}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-xs text-stone-400">
                                        ไม่มีออเดอร์ที่รอทำอยู่ในขณะนี้
                                    </div>
                                )}
                            </section>
                        )}

                        {/* 2. ส่วน: กำลังทำ */}
                        {(!filterStatus ? cookingOrders.length > 0 : filterStatus === "กำลังทำ") && (
                            <section className="flex flex-col gap-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B75A6] text-white text-xs font-semibold">
                                        <CookingPot className="w-3.5 h-3.5 stroke-[2]" />
                                        <span>กำลังทำ</span>
                                    </div>
                                    <span className="text-xs text-stone-500 font-medium">
                                        {cookingOrders.length} ออเดอร์
                                    </span>
                                </div>

                                {cookingOrders.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {cookingOrders.map((order) => (
                                            <KDSCard
                                                key={order.id}
                                                order={order}
                                                onUpdateStatus={updateOrderStatus}
                                                onCancelOrder={cancelOrder}
                                                onCompleteOrder={completeOrder}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-xs text-stone-400">
                                        ไม่มีออเดอร์ที่กำลังปรุงในครัว
                                    </div>
                                )}
                            </section>
                        )}

                        {/* 3. ส่วน: พร้อมเสิร์ฟ */}
                        {(!filterStatus ? readyOrders.length > 0 : filterStatus === "พร้อมเสิร์ฟ") && (
                            <section className="flex flex-col gap-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E7D4E] text-white text-xs font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
                                        <span>พร้อมเสิร์ฟ</span>
                                    </div>
                                    <span className="text-xs text-stone-500 font-medium">
                                        {readyOrders.length} ออเดอร์
                                    </span>
                                </div>

                                {readyOrders.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {readyOrders.map((order) => (
                                            <KDSCard
                                                key={order.id}
                                                order={order}
                                                onUpdateStatus={updateOrderStatus}
                                                onCancelOrder={cancelOrder}
                                                onCompleteOrder={completeOrder}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-xs text-stone-400">
                                        ไม่มีออเดอร์ที่พร้อมเสิร์ฟในขณะนี้
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}

                {/* ปุ่มลอยรูป ? มุมขวาล่าง (ตรงตาม Screenshot 1 & 2) */}
                <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="fixed bottom-6 right-6 w-9 h-9 rounded-full bg-white border border-stone-300 shadow-md text-stone-600 hover:text-[#2D241E] hover:border-stone-400 active:scale-95 transition-all flex items-center justify-center font-bold text-sm cursor-pointer z-20"
                    title="คู่มือการใช้งานจอครัว KDS"
                >
                    ?
                </button>
            </main>

            {/* Modal ช่วยเหลือและแนะนำการทำงาน */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-kanit">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                            <div className="flex items-center gap-2 text-[#2D241E]">
                                <HelpCircle className="w-5 h-5 text-[#8C6D58]" />
                                <h3 className="font-semibold text-base">ระบบจอครัว (Kitchen Display)</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-sm text-stone-600">
                            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                                <span className="font-semibold text-amber-800">1. รอทำ (Pending)</span>
                                <p className="text-xs text-amber-900/80 mt-0.5">
                                    ออเดอร์ส่งตรงมาจากหน้า POS สามารถกด <b>"ยกเลิกออเดอร์"</b> ได้ หรือกด <b>"กำลังทำ"</b> เมื่อเริ่มปรุงอาหาร
                                </p>
                            </div>

                            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                                <span className="font-semibold text-blue-800">2. กำลังทำ (Cooking)</span>
                                <p className="text-xs text-blue-900/80 mt-0.5">
                                    อาหารกำลังปรุงอยู่ในครัว เมื่อปรุงเสร็จแล้วให้กด <b>"พร้อมเสิร์ฟ"</b>
                                </p>
                            </div>

                            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                                <span className="font-semibold text-emerald-800">3. พร้อมเสิร์ฟ (Ready)</span>
                                <p className="text-xs text-emerald-900/80 mt-0.5">
                                    อาหารพร้อมให้พนักงานนำไปส่งที่โต๊ะ เมื่อเสิร์ฟแล้วให้กด <b>"เสิร์ฟแล้ว"</b> เพื่อจบกระบวนการ
                                </p>
                            </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                            <button
                                type="button"
                                onClick={() => {
                                    clearAllOrders()
                                    setShowHelpModal(false)
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>ล้างออเดอร์ทั้งหมด</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="py-2 px-5 rounded-xl bg-[#A68874] text-white text-xs font-medium hover:bg-[#967763] transition-all cursor-pointer"
                            >
                                เข้าใจแล้ว
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}