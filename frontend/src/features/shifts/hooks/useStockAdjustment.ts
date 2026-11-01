import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { inventoryApi } from '../../inventory/api/inventory.api';
import { shiftsApi } from '../../shifts/api/shifts.api';
import type {
  StockCountBatchResult,
  StockItem,
} from '../../inventory/types/inventory.types';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** เทียบวันปฏิทินแบบ fallback หากยังไม่มีข้อมูลกะ */
const isToday = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

/**
 * ปรับวัตถุดิบคงเหลือตอนจบวัน (Periodic Physical Count — INV-11)
 * โหลดยอดระบบของวัตถุดิบที่ใช้งานทั้งหมด แล้วให้กรอกเฉพาะตัวที่ได้นับจริง
 * เทียบยอดนับของวันทำการปัจจุบัน (business_date) แทนวันปฏิทิน local เพื่อรองรับร้านเปิดข้ามคืน
 */
export function useStockAdjustment() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [countedToday, setCountedToday] = useState(0);
  const [businessDate, setBusinessDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StockCountBatchResult | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const [stockResponse, shiftResponse] = await Promise.all([
          inventoryApi.getStock(accessToken),
          shiftsApi.getCurrent(accessToken),
        ]);
        setItems(stockResponse.data);

        const currentBDate = shiftResponse.data?.businessDate ?? null;
        setBusinessDate(currentBDate);

        const transactionsResponse = await inventoryApi.getTransactions(accessToken, {
          type: 'adjustment',
          limit: 200,
          businessDate: currentBDate ?? undefined,
        });

        // หากมี businessDate ประจำกะ ให้เทียบกับ business_date ของธุรกรรม
        if (currentBDate) {
          setCountedToday(
            transactionsResponse.data.filter(
              (transaction) => transaction.business_date === currentBDate,
            ).length,
          );
        } else {
          setCountedToday(
            transactionsResponse.data.filter((transaction) => isToday(transaction.created_at)).length,
          );
        }
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'ไม่สามารถโหลดข้อมูลวัตถุดิบได้'));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    // Fetching after mount necessarily updates local request state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filledEntries = useMemo(
    () =>
      Object.entries(counts)
        .map(([ingredientId, raw]) => ({ ingredientId, raw: raw.trim() }))
        .filter((entry) => entry.raw !== ''),
    [counts],
  );

  const invalidCount = filledEntries.filter((entry) => {
    const parsed = Number(entry.raw);
    return Number.isNaN(parsed) || parsed < 0;
  }).length;

  const filledCount = filledEntries.length - invalidCount;

  const setCount = (ingredientId: string, value: string) =>
    setCounts((previous) => ({ ...previous, [ingredientId]: value }));

  const clearCounts = () => setCounts({});

  const submit = async () => {
    const payload = filledEntries.flatMap((entry) => {
      const counted = Number(entry.raw);
      if (Number.isNaN(counted) || counted < 0) return [];
      return [{ ingredient_id: entry.ingredientId, counted_quantity: counted }];
    });

    if (payload.length === 0) return false;

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await inventoryApi.recordStockCountBatch(accessToken, payload);
      setResult(response.data);
      setCounts({});
      await load(true);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'ไม่สามารถบันทึกการนับวัตถุดิบได้'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    items,
    counts,
    setCount,
    clearCounts,
    countedToday,
    businessDate,
    filledCount,
    invalidCount,
    isLoading,
    isSubmitting,
    error,
    result,
    submit,
    reload: () => load(true),
  };
}
