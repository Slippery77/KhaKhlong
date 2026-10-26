export type TransactionType = 'SALE' | 'CASH_IN' | 'CASH_OUT';
export type PaymentMethod = 'CASH' | 'TRANSFER';
export type TimeFilter = 'TODAY' | 'WEEK' | 'MONTH';

export interface BillItem {
    id?: string;
    name: string;
    quantity: number;
    price: number;
    selectedSpiciness?: string;
    selectedAddons?: { name: string; price: number }[];
    note?: string;
}

export interface SaleTransaction {
    id: string;
    type: TransactionType;
    time: string;           // e.g. "23:00"
    date: string;           // ISO date string e.g. "2026-10-17"
    timestamp: number;      // Epoch ms for accurate sorting and period filtering
    billNumber?: number;    // e.g. 1 for "บิล #1"
    description: string;    // e.g. "บิล #1" or "ซื้อวัตถุดิบ"
    cashAmount: number;     // e.g. +187 or -70 or 0
    transferAmount: number; // e.g. +161 or 0
    paymentMethod?: PaymentMethod;
    performedBy: string;    // e.g. "วิชัย ใจดี"
    table?: string;
    items?: BillItem[];
    subtotal?: number;
    vat?: number;
    total?: number;
    received?: number;
    change?: number;
}

export interface ChartDataPoint {
    label: string;          // e.g. "23:00", "เสาร์", "สัปดาห์ที่ 3"
    subLabel?: string;
    totalSales: number;
    billCount: number;
    isHighlight?: boolean;
}

export interface DailySalesData {
    dayName: string;
    dayIndex: number;
    totalSales: number;
    billCount: number;
    isCurrentDay: boolean;
}

export interface BestSellingItem {
    name: string;
    quantity: number;
    totalAmount: number;
    percentage: number;
}

/** เมนูขายดีจัดกลุ่มตามหมวดหมู่ (แสดงเฉพาะ top 3 ของแต่ละหมวด) */
export interface BestSellingCategory {
    categoryId: string;
    categoryName: string;
    categoryTotal: number;
    items: BestSellingItem[];
}
