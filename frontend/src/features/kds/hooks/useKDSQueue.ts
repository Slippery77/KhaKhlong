import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch } from "../../../libs/appClient"
import { useAuth } from "../../auth/context/AuthContext"
import type { ApiKDSItem, KDSTicket } from "../types/kds.types"
import { groupItemsToTickets } from "../types/kds.types"

const POLL_INTERVAL_MS = 3000

interface KdsQueueResponse {
    status: string
    data: ApiKDSItem[]
}

interface KdsUpdateResponse {
    status: string
    data: ApiKDSItem
}

export function useKDSQueue() {
    const { accessToken } = useAuth()
    const [tickets, setTickets] = useState<KDSTicket[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    // เก็บ accessToken ล่าสุดใน ref เพื่อให้ setInterval callback ใช้ได้เสมอ
    const tokenRef = useRef<string | null>(accessToken)

    // อัปเดต ref ทุกครั้งที่ token เปลี่ยน
    useEffect(() => {
        tokenRef.current = accessToken
    }, [accessToken])

    const fetchQueue = useCallback(
        async (silent = false) => {
            const token = tokenRef.current
            if (!token) return
            if (!silent) setIsLoading(true)
            try {
                const res = await apiFetch<KdsQueueResponse>("/kds/queue", token)
                setTickets(groupItemsToTickets(res.data ?? []))
                setError(null)
            } catch (err) {
                setError(err instanceof Error ? err.message : "โหลดคิวครัวไม่สำเร็จ")
            } finally {
                if (!silent) setIsLoading(false)
            }
        },
        [], // ไม่ depend on accessToken โดยตรง — ใช้ tokenRef แทน
    )

    // เริ่ม polling ครั้งเดียวตอน mount, ใช้ tokenRef ใน interval callback
    useEffect(() => {
        // โหลดทันที
        fetchQueue()

        // start polling
        intervalRef.current = setInterval(() => {
            fetchQueue(true)
        }, POLL_INTERVAL_MS)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // mount ครั้งเดียว

    // ถ้า accessToken เปลี่ยนจาก null → มีค่า (เพิ่งล็อกอิน) ให้ดึงใหม่ทันที
    useEffect(() => {
        if (accessToken) {
            fetchQueue()
        }
    }, [accessToken, fetchQueue])

    const updateItemStatus = useCallback(
        async (
            itemIds: string[],
            newStatus: "queued" | "preparing" | "ready" | "served" | "voided",
            voidReason?: string,
        ) => {
            const token = tokenRef.current
            if (!token) return
            try {
                await Promise.all(
                    itemIds.map((id) =>
                        apiFetch<KdsUpdateResponse>(
                            `/kds/items/${id}/status`,
                            token,
                            "PATCH",
                            { status: newStatus, ...(voidReason ? { voidReason } : {}) },
                        ),
                    ),
                )
                await fetchQueue(true)
            } catch (err) {
                setError(err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ")
            }
        },
        [fetchQueue],
    )

    return {
        tickets,
        isLoading,
        error,
        reload: () => fetchQueue(false),
        updateItemStatus,
    }
}
