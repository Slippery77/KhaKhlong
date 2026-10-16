/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { KDSOrder, KDSStatus } from "../types/kds.types"
import type { CartMenu } from "../../mainpos/types/pos.types"

interface KDSContextType {
    orders: KDSOrder[]
    sendOrderToKitchen: (table: string, items: CartMenu[]) => KDSOrder
    updateOrderStatus: (orderId: string, newStatus: KDSStatus) => void
    cancelOrder: (orderId: string) => void
    completeOrder: (orderId: string) => void
    clearAllOrders: () => void
}

const STORAGE_KEY = "pos_kds_orders"
const ORDER_COUNTER_KEY = "pos_kds_order_counter"

export const KDSContext = createContext<KDSContextType | undefined>(undefined)

export function KDSProvider({ children }: { children: ReactNode }) {
    const [orders, setOrders] = useState<KDSOrder[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })

    // ซิงค์ข้อมูลกับ localStorage ทุกครั้งที่ orders เปลี่ยนแปลง
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
        } catch (e) {
            console.error("Failed to save KDS orders to localStorage", e)
        }
    }, [orders])

    // รองรับการซิงค์ระหว่าง Tabs หรือหน้าต่างเบราว์เซอร์พร้อมกันแบบ Real-time
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    setOrders(JSON.parse(e.newValue))
                } catch (err) {
                    console.error("Error parsing synced KDS orders", err)
                }
            }
        }

        window.addEventListener("storage", handleStorageChange)
        return () => window.removeEventListener("storage", handleStorageChange)
    }, [])

    // ฟังก์ชันส่งออเดอร์จาก POS ไปยังครัว (สร้างเป็น status 'รอทำ')
    const sendOrderToKitchen = (table: string, items: CartMenu[]): KDSOrder => {
        const currentCounter = parseInt(localStorage.getItem(ORDER_COUNTER_KEY) || "0", 10) + 1
        localStorage.setItem(ORDER_COUNTER_KEY, currentCounter.toString())

        const newOrder: KDSOrder = {
            id: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            orderNumber: currentCounter,
            table: table || "โต๊ะ 1",
            status: "รอทำ",
            createdAt: Date.now(),
            items: items.map((item) => ({
                id: item.cartItemId || item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                basePrice: item.basePrice,
                selectedSpiciness: item.selectedSpiciness,
                selectedAddons: item.selectedAddons,
                note: item.note,
            })),
            totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        }

        setOrders((prev) => [newOrder, ...prev])
        return newOrder
    }

    // ฟังก์ชันเปลี่ยนสถานะออเดอร์ (รอทำ -> กำลังทำ -> พร้อมเสิร์ฟ)
    const updateOrderStatus = (orderId: string, newStatus: KDSStatus) => {
        setOrders((prev) =>
            prev.map((order) =>
                order.id === orderId ? { ...order, status: newStatus } : order
            )
        )
    }

    // ฟังก์ชันยกเลิกออเดอร์ (สำหรับสถานะรอทำ)
    const cancelOrder = (orderId: string) => {
        setOrders((prev) => prev.filter((order) => order.id !== orderId))
    }

    // ฟังก์ชันเสร็จสิ้นออเดอร์ (เมื่อเสิร์ฟอาหารเรียบร้อย)
    const completeOrder = (orderId: string) => {
        setOrders((prev) => prev.filter((order) => order.id !== orderId))
    }

    // ล้างออเดอร์ทั้งหมด
    const clearAllOrders = () => {
        setOrders([])
        localStorage.removeItem(STORAGE_KEY)
    }

    return (
        <KDSContext.Provider
            value={{
                orders,
                sendOrderToKitchen,
                updateOrderStatus,
                cancelOrder,
                completeOrder,
                clearAllOrders,
            }}
        >
            {children}
        </KDSContext.Provider>
    )
}

export function useKDS() {
    const context = useContext(KDSContext)
    if (!context) {
        throw new Error("useKDS must be used within a KDSProvider")
    }
    return context
}
