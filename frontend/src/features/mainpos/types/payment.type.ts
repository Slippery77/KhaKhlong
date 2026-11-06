

export type PaymentMethod = 'cash' | 'qr_code'

export interface PaymentAttempt {
  paymentAttemptId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  qrPayload:string|null;
}

/** ส่งให้ /verify-slip อย่างใดอย่างหนึ่ง */
export type SlipInput = { qrData: string } | { imageBase64: string }

export interface VerifiedSlip {
  transRef: string
  amount: number
  sendingBank: string | null
  senderName: string | null
  receiverName: string | null
  /** unverifiable = สลิปไม่แสดงเลขพร้อมเพย์ผู้รับ ระบบเทียบให้ไม่ได้ */
  receiverMatch: 'matched' | 'unverifiable'
  transAt: string | null
}

export interface SlipVerificationStatus {
  enabled: boolean
  quota: { quota: number; overQuota: number; specialQuota: number; endDate: string | null } | null
}

export interface PaymentResult {
  paymentId: string
  receiptNumber: string
  totalAmount: number
  cashReceived: number | null
  changeAmount: number | null
}