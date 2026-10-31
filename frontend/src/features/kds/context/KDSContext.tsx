/* eslint-disable react-refresh/only-export-components */
/**
 * KDSContext
 *
 * ยังคง sendOrderToKitchen() เพื่อให้ MainPOS เรียกได้เมื่อกด "ส่งครัว"
 * แต่ orders ที่จะแสดงบนหน้า KDS ตอนนี้ดึงจาก backend (useKDSQueue) ไม่ใช่ localStorage
 *
 * Context นี้ไว้เพื่อ:
 *  1. นับ pendingOrdersCount ใน Header badge (ดึงจาก localStorage ชั่วคราว)
 *  2. clearAllOrders() สำหรับปุ่มในหน้า KDS help modal
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { KDSOrder, KDSStatus } from "../types/kds.types"
import type { CartMenu } from "../../mainpos/types/pos.types"

interface KDSContextType {
    orders: KDSOrder[]           // legacy localStorage orders (ใช้ count badge บน Header)
    sendOrderToKitchen: (table: string, items: CartMenu[]) => KDSOrder
    updateOrderStatus: (orderId: string, newStatus: KDSStatus) => void
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

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
        } catch (e) {
            console.error("Failed to save KDS orders to localStorage", e)
        }
    }, [orders])

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

    const sendOrderToKitchen = (table: string, items: CartMenu[]): KDSOrder => {
        const currentCounter =
            parseInt(localStorage.getItem(ORDER_COUNTER_KEY) || "0", 10) + 1
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

    const updateOrderStatus = (orderId: string, newStatus: KDSStatus) => {
        setOrders((prev) =>
            prev.map((order) =>
                order.id === orderId ? { ...order, status: newStatus } : order,
            ),
        )
    }

    const completeOrder = (orderId: string) => {
        setOrders((prev) => prev.filter((order) => order.id !== orderId))
    }

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
