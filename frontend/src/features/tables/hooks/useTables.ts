import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../../libs/appClient'
import { useAuth } from '../../auth/context/AuthContext'
import type { DiningTable } from '../types/table.types'

interface TablesResponse {
    status: string
    data: DiningTable[]
}

export function useTables() {
    const { accessToken } = useAuth()
    const [tables, setTables] = useState<DiningTable[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(
        async (silent = false) => {
            if (!silent) setIsLoading(true)
            setError(null)
            try {
                const res = await apiFetch<TablesResponse>('/tables', accessToken)
                setTables(res.data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'โหลดข้อมูลโต๊ะไม่สำเร็จ')
            } finally {
                setIsLoading(false)
            }
        },
        [accessToken],
    )

    useEffect(() => {
        load()
    }, [load])

    return { tables, isLoading, error, reload: () => load(false) }
}
