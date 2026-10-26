

export type PaymentMethod = 'cash' | 'qr_code'

export interface PaymentAttempt {
  paymentAttemptId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  qrPayload:string|null;
}

export interface PaymentResult {
  paymentId: string
  receiptNumber: string
  totalAmount: number
  cashReceived: number | null
  changeAmount: number | null
}