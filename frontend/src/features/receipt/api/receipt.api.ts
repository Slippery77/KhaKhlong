import { apiFetch } from '../../../libs/appClient';
import type { ReceiptData, ReceiptPrintResult } from '../types/receipt.types';

interface ApiEnvelope<T> {
  status: 'success';
  data: T;
}

export const receiptApi = {
  /** อ่านข้อมูลใบเสร็จ (ไม่นับเป็นการพิมพ์) */
  get: (token: string | null, paymentId: string) =>
    apiFetch<ApiEnvelope<ReceiptData>>(`/payments/${paymentId}/receipt`, token).then((r) => r.data),

  /**
   * บันทึกการพิมพ์ — ต้องเรียกทุกครั้งก่อนสั่งพิมพ์จริง
   * เกินจำนวนที่ร้านกำหนดจะได้ 409 และไม่ควรเปิดหน้าต่างพิมพ์
   */
  recordPrint: (token: string | null, paymentId: string) =>
    apiFetch<ApiEnvelope<ReceiptPrintResult>>(
      `/payments/${paymentId}/print`,
      token,
      'POST',
    ).then((r) => r.data),
};
