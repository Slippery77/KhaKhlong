import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ApiError } from '../../../libs/appClient';
import { receiptApi } from '../api/receipt.api';
import type { ReceiptData, ReceiptPrintResult } from '../types/receipt.types';

/** โหลดข้อมูลใบเสร็จจาก server (อ่านอย่างเดียว) + บันทึกการพิมพ์ */
export function useReceipt(paymentId: string | null) {
  const { accessToken } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ใช้สั่งโหลดใหม่จาก event handler (ไม่ setState ใน effect โดยตรง)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;

    receiptApi
      .get(accessToken, paymentId)
      .then((data) => {
        if (cancelled) return;
        setReceipt(data);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, paymentId, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const recordPrint = useCallback((): Promise<ReceiptPrintResult> => {
    if (!paymentId) return Promise.reject(new Error('ไม่พบรหัสใบเสร็จ'));
    return receiptApi.recordPrint(accessToken, paymentId);
  }, [accessToken, paymentId]);

  return { receipt, loading, error, reload, recordPrint };
}
