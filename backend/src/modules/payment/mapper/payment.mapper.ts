const toNum = (v:string|null)=> (v===null?null: Number(v));

export interface PaymentAttemptResponse{
    paymentAttemptId:string;
    paymentMethod:string;
    amount:number;
    status:string;
    qrReference:string|null;
    failureReason:string|null;
    initiatedBy:string;
    createdAt:Date;
    updatedAt:Date|null;
    qrPayload:string|null;
}

export function toPaymentAttemptResponse(rows:any):PaymentAttemptResponse{
    return {
        paymentAttemptId:rows.payment_attempt_id,
        paymentMethod:rows.payment_method,
        amount:Number(rows.amount),
        status:rows.status,
        qrReference:rows.qr_reference,
        failureReason:rows.failure_reason,
        initiatedBy:rows.initiated_by,
        createdAt:rows.created_at,
        updatedAt:rows.updated_at,
        qrPayload:rows.qrPayload,
    }
}

export interface PaymentResponse{
    paymentId:string;
    paymentAttemptId:string;
    receiptNumber:string;
    businessDate:string;
    subtotal:number; 
    vatAmount:number;
    serviceChargeAmount:number;
    totalAmount:number; 
    vatMode:string; 
    vatRate:number;
    serviceChargeRate:number;
    roundingAdjustment:number;
    paymentMethod:string;
    cashReceived:number|null; 
    changeAmount:number|null; 
    paidAt:Date;
}

export function toPaymentResponse(rows: any): PaymentResponse {
    if (!rows) throw new Error('toPaymentResponse: payment row is null or undefined');
    return {
        paymentId:rows.payment_id,
        paymentAttemptId:rows.payment_attempt_id,
        receiptNumber:rows.receipt_number,
        businessDate:rows.business_date,
        subtotal:Number(rows.subtotal),
        vatAmount:Number(rows.vat_amount),
        serviceChargeAmount:Number(rows.service_charge_amount),
        totalAmount:Number(rows.total_amount),
        vatMode:rows.vat_mode,
        // ค่า snapshot ตอนปิดบิล — ใบเสร็จแสดงเป็นป้ายกำกับเท่านั้น ไม่นำไปคำนวณซ้ำ
        vatRate:Number(rows.vat_rate_snapshot ?? 0),
        serviceChargeRate:Number(rows.service_charge_rate_snapshot ?? 0),
        roundingAdjustment:Number(rows.rounding_adjustment ?? 0),
        paymentMethod:rows.payment_method,
        cashReceived:toNum(rows.cash_received),
        changeAmount:toNum(rows.change_amount),
        paidAt:rows.paid_at
    }
}

export function toReceiptResponse(payment: any, store: any, tables: any[], lines: any[]) {
  return {
    ...toPaymentResponse(payment),
    cashier: payment.cashier_name,
    store: {
      name: store.restaurant_name,
      phone: store.phone,
      taxId: payment.vat_mode === 'none' ? null : store.tax_id,
      address: [store.house_number, store.moo && `หมู่ ${store.moo}`, store.soi, store.road,
                store.subdistrict, store.district, store.province, store.postal_code]
               .filter(Boolean).join(' '),
    },
    tables: tables.map(t => ({ orderNumber: t.order_number, tableNumber: t.table_number })),
    lines: lines.map(l => ({
      name: l.item_name_snapshot,
      modifiers: l.modifiers,
      unitPrice: Number(l.gross_price),
      qty: Number(l.qty),
      lineTotal: Number(l.line_total),
      isComped: l.is_comped,
    })),
    footer: store.receipt_footer ?? null,
    showTaxId: store.receipt_show_tax_id !== 'false',
    showCashier: store.receipt_show_cashier !== 'false',
    showAddress: store.receipt_show_address !== 'false',
  };
}
