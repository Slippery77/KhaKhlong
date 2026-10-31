import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../../libs/appClient'
import { useAuth } from '../../auth/context/AuthContext'
import { fetchWithSnapshot, isUnreachableError } from '../../offline/snapshotCache'
import type { DiningTable } from '../types/table.types'

interface TablesResponse {
    status: string
    data: DiningTable[]
}

export function useTables() {
    const { accessToken, user } = useAuth()
    const tenantSlug = user?.tenantSlug
    const [tables, setTables] = useState<DiningTable[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // null = ข้อมูลสดจาก server · ตัวเลข = กำลังแสดง snapshot ที่บันทึกเมื่อเวลานั้น (ออฟไลน์)
    const [staleSince, setStaleSince] = useState<number | null>(null)

    const load = useCallback(
        async (silent = false) => {
            if (!silent) setIsLoading(true)
            setError(null)
            try {
                // ลอง server ก่อน ติดต่อไม่ได้ค่อยใช้ผังโต๊ะล่าสุดที่บันทึกไว้ในเครื่อง
                const result = await fetchWithSnapshot(tenantSlug, 'tables', async () => {
                    const res = await apiFetch<TablesResponse>('/tables', accessToken)
                    return res.data
                })
                setTables(result.data)
                setStaleSince(result.isStale ? result.savedAt : null)
            } catch (err) {
                if (isUnreachableError(err)) {
                    // ติดต่อ server ไม่ได้ และเครื่องนี้ยังไม่เคยโหลดผังโต๊ะของร้านนี้สำเร็จเลย
                    setError('ติดต่อเซิร์ฟเวอร์ไม่ได้ และยังไม่มีผังโต๊ะที่บันทึกไว้ในเครื่องนี้')
                } else {
                    setError(err instanceof Error ? err.message : 'โหลดข้อมูลโต๊ะไม่สำเร็จ')
                }
            } finally {
                setIsLoading(false)
            }
        },
        [accessToken, tenantSlug],
    )

    useEffect(() => {
        load()
    }, [load])

    return { tables, isLoading, error, staleSince, reload: () => load(false) }
}
