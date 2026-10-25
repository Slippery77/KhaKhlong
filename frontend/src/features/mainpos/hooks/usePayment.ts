import { useCallback } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { apiFetch } from "../../../libs/appClient";
import type { PaymentMethod, PaymentResult, PaymentAttempt } from "../types/payment.type";

export interface OrderPaymentSummary {
    orderId: string
    amount: number
    itemCount: number
}

export function usePayment(){
    const {accessToken} = useAuth();

    // หน้า 1: จองบิลและได้ยอดจาก server
    const createAttempt = (orderIds: string[], paymentMethod: PaymentMethod) =>
        apiFetch<{ data: PaymentAttempt }>('/payments/attempts', accessToken, 'POST', { orderIds, paymentMethod }).then(r => r.data)

    // ก่อนสร้าง attempt: ดึงยอดรวมของบิลจาก server มาแสดงผล (อ่านอย่างเดียว)
    const getOrderSummary = useCallback(
        (orderId: string) =>
            apiFetch<{ data: OrderPaymentSummary }>(
                `/payments/orders/${orderId}/summary`, accessToken,
            ).then(r => r.data),
        [accessToken],
    )

    // หน้า 2: ยืนยันรับเงิน (QR ไม่ส่ง cashReceived)
    const pay = (attemptId: string, cashReceived?: number) =>
        apiFetch<{ data: PaymentResult }>(
        `/payments/attempts/${attemptId}/pay`, accessToken, 'POST',
        cashReceived === undefined ? {} : { cashReceived },
    ).then(r => r.data)

    // ปิด modal หรือย้อนกลับ: ปล่อยบิล
    const cancel = (attemptId: string, reason: string) =>
        apiFetch<{ data: PaymentAttempt }>(
        `/payments/attempts/${attemptId}/cancel`, accessToken, 'POST', { reason },
    ).then(r => r.data)
    return {createAttempt,pay,cancel,getOrderSummary}
}