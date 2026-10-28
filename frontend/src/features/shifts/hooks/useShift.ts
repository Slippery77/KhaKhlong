import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../libs/appClient';
import { useAuth } from '../../auth/context/AuthContext';
import { fetchWithSnapshot, saveSnapshot } from '../../offline/snapshotCache';
import { shiftsApi } from '../api/shifts.api';
import type {
  BlockedOrder,
  OpenOrdersBlockBody,
  Shift,
} from '../types/shift.types';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useShift() {
  const { accessToken, user } = useAuth();
  const tenantSlug = user?.tenantSlug;
  const [shift, setShift] = useState<Shift | null>(null);
  // null = ข้อมูลกะสดจาก server · ตัวเลข = แสดง snapshot ที่บันทึกเมื่อเวลานั้น (ออฟไลน์)
  const [staleSince, setStaleSince] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [blockedOrders, setBlockedOrders] = useState<BlockedOrder[]>([]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        // เก็บกะปัจจุบันไว้ในเครื่อง — ตอนออฟไลน์ยังรู้ว่ากะไหนเปิดอยู่ (ใช้ผูกออเดอร์ออฟไลน์ภายหลัง)
        const result = await fetchWithSnapshot(tenantSlug, 'currentShift', async () => {
          const response = await shiftsApi.getCurrent(accessToken);
          return response.data;
        });
        setShift(result.data);
        setStaleSince(result.isStale ? result.savedAt : null);
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'ไม่สามารถโหลดข้อมูลกะได้'));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [accessToken, tenantSlug],
  );

  /** อัปเดตกะบนหน้าจอ + snapshot ในเครื่องพร้อมกัน หลังเปิด/ปิด/รับรองกะสำเร็จ */
  const applyShift = (next: Shift | null) => {
    setShift(next);
    setStaleSince(null);
    if (tenantSlug) void saveSnapshot(tenantSlug, 'currentShift', next);
  };

  useEffect(() => {
    // Fetching after mount necessarily updates local request state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openShift = async (openingCash: number) => {
    setIsSubmitting(true);
    setError(null);
    setBlockedOrders([]);
    try {
      const response = await shiftsApi.open(accessToken, openingCash);
      applyShift(response.data);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'ไม่สามารถเปิดกะได้'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  /** คืนกะที่ปิดแล้ว หรือ null ถ้าปิดไม่สำเร็จ (มีบิลค้าง / error อื่น) */
  const closeShift = async (actualClosingCash: number): Promise<Shift | null> => {
    if (!shift) return null;
    setIsSubmitting(true);
    setError(null);
    setBlockedOrders([]);
    try {
      const response = await shiftsApi.close(accessToken, shift.shiftId, actualClosingCash);
      applyShift(response.data);
      return response.data;
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        const body = requestError.body as OpenOrdersBlockBody | null;
        if (body?.code === 'OPEN_ORDERS_BLOCK_CLOSE') {
          setBlockedOrders(body.orders);
          setError(body.message);
          return null;
        }
      }
      setError(getErrorMessage(requestError, 'ไม่สามารถปิดกะได้'));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyWithPin = async (pin: string) => {
    if (!shift) return false;
    setIsSubmitting(true);
    setPinError(null);
    try {
      const response = await shiftsApi.verify(accessToken, shift.shiftId, pin);
      applyShift(response.data);
      return true;
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 429) {
        setPinError('กรอก PIN ผิดหลายครั้งเกินไป กรุณารอ 5 นาทีแล้วลองใหม่');
      } else if (requestError instanceof ApiError && requestError.status === 403) {
        setPinError(getErrorMessage(requestError, 'PIN ไม่ถูกต้อง'));
      } else {
        setPinError(getErrorMessage(requestError, 'ไม่สามารถยืนยันยอดได้'));
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    shift,
    isLoading,
    isSubmitting,
    error,
    pinError,
    blockedOrders,
    staleSince,
    reload: () => load(true),
    openShift,
    closeShift,
    verifyWithPin,
  };
}
