/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode, useMemo } from 'react';
import type { 
    SaleTransaction, 
    PaymentMethod, 
    TimeFilter, 
    ChartDataPoint,
    DailySalesData, 
    BestSellingItem,
    BillItem
} from '../types/sales.types';

interface SalesContextType {
    transactions: SaleTransaction[];
    filteredTransactions: SaleTransaction[];
    filter: TimeFilter;
    setFilter: (f: TimeFilter) => void;
    addSaleTransaction: (params: {
        billNumber?: number;
        items: BillItem[];
        subtotal: number;
        vat: number;
        total: number;
        paymentMethod: PaymentMethod;
        received?: number;
        change?: number;
        table?: string;
        performedBy?: string;
    }) => SaleTransaction;
    addCashMovement: (
        type: 'CASH_IN' | 'CASH_OUT',
        amount: number,
        description: string,
        performedBy?: string
    ) => SaleTransaction;
    metrics: {
        cashOnHand: number;
        totalIncome: number;
        totalExpense: number;
        cashSales: number;
        transferSales: number;
        totalBillsCount: number;
    };
    chartTitle: string;
    chartData: ChartDataPoint[];
    dailySalesData: DailySalesData[];
    topSellingItems: BestSellingItem[];
}

const STORAGE_KEY = 'pos_sales_transactions';
const BILL_COUNTER_KEY = 'pos_sales_bill_counter';

// Initial data mirroring the user's mockup exactly
const getInitialTransactions = (): SaleTransaction[] => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    return [
        {
            id: 'tx-mock-1',
            type: 'CASH_OUT',
            time: '00:18',
            date: dateStr,
            timestamp: new Date().setHours(0, 18, 0, 0) - 120000,
            description: 'ซื้อวัตถุดิบ',
            cashAmount: -70,
            transferAmount: 0,
            performedBy: 'วิชัย ใจดี',
        },
        {
            id: 'tx-mock-2',
            type: 'SALE',
            time: '00:18',
            date: dateStr,
            timestamp: new Date().setHours(0, 18, 45, 0),
            billNumber: 1,
            description: 'บิล #1',
            cashAmount: 187,
            transferAmount: 0,
            paymentMethod: 'CASH',
            performedBy: 'วิชัย ใจดี',
            table: 'โต๊ะ 1',
            items: [
                { name: 'ผัดซีอิ๊วหมู', quantity: 1, price: 85 },
                { name: 'ลาบหมู', quantity: 1, price: 90 },
            ],
            subtotal: 175,
            vat: 12,
            total: 187,
            received: 200,
            change: 13,
        },
        {
            id: 'tx-mock-3',
            type: 'SALE',
            time: '00:20',
            date: dateStr,
            timestamp: new Date().setHours(0, 20, 10, 0),
            billNumber: 2,
            description: 'บิล #2',
            cashAmount: 161,
            transferAmount: 0,
            paymentMethod: 'CASH',
            performedBy: 'วิชัย ใจดี',
            table: 'โต๊ะ 2',
            items: [
                {
                    name: 'ผัดกะเพราหมูสับ',
                    quantity: 1,
                    price: 95,
                    selectedSpiciness: 'เผ็ดปกติ',
                    selectedAddons: [{ name: 'เพิ่มไข่ดาว', price: 10 }],
                },
                { name: 'ชาไทยเย็น', quantity: 2, price: 33 },
            ],
            subtotal: 150.47,
            vat: 10.53,
            total: 161,
            received: 500,
            change: 339,
        },
    ];
};

export const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function SalesProvider({ children }: { children: ReactNode }) {
    const [transactions, setTransactions] = useState<SaleTransaction[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
            const initial = getInitialTransactions();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
            localStorage.setItem(BILL_COUNTER_KEY, '2');
            return initial;
        } catch {
            return getInitialTransactions();
        }
    });

    const [filter, setFilter] = useState<TimeFilter>('WEEK');

    // Sync to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        } catch (e) {
            console.error('Failed to save sales transactions to localStorage', e);
        }
    }, [transactions]);

    // Real-time multi-tab sync
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    setTransactions(JSON.parse(e.newValue));
                } catch (err) {
                    console.error('Error parsing synced sales transactions', err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Filter transactions based on active period
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        // start of week (Sunday)
        const currentDay = now.getDay();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay).getTime();
        
        // start of month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return transactions.filter((tx) => {
            const txTime = tx.timestamp || new Date(tx.date).getTime();
            if (filter === 'TODAY') {
                return txTime >= startOfDay;
            }
            if (filter === 'WEEK') {
                return txTime >= startOfWeek;
            }
            if (filter === 'MONTH') {
                return txTime >= startOfMonth;
            }
            return true;
        });
    }, [transactions, filter]);

    // Calculate metrics
    const metrics = useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;
        let cashSales = 0;
        let transferSales = 0;
        let totalBillsCount = 0;

        filteredTransactions.forEach((tx) => {
            if (tx.type === 'SALE') {
                totalBillsCount += 1;
                const saleAmount = (tx.cashAmount || 0) + (tx.transferAmount || 0);
                totalIncome += saleAmount;
                if (tx.paymentMethod === 'CASH' || tx.cashAmount > 0) {
                    cashSales += tx.cashAmount || 0;
                }
                if (tx.paymentMethod === 'TRANSFER' || tx.transferAmount > 0) {
                    transferSales += tx.transferAmount || 0;
                }
            } else if (tx.type === 'CASH_IN') {
                totalIncome += tx.cashAmount || 0;
            } else if (tx.type === 'CASH_OUT') {
                totalExpense += Math.abs(tx.cashAmount || 0);
            }
        });

        // Cash on hand: total cash in drawer across all transactions
        const cashOnHand = transactions.reduce((acc, tx) => {
            return acc + (tx.cashAmount || 0);
        }, 0);

        return {
            cashOnHand,
            totalIncome,
            totalExpense,
            cashSales,
            transferSales,
            totalBillsCount,
        };
    }, [filteredTransactions, transactions]);

    // Chart title based on filter
    const chartTitle = useMemo(() => {
        if (filter === 'TODAY') return 'ยอดขายรายชั่วโมง';
        if (filter === 'WEEK') return 'ยอดขายรายวัน';
        return 'ยอดขายรายสัปดาห์';
    }, [filter]);

    // Chart Data Points based on filter:
    // - TODAY: Hourly buckets
    // - WEEK: Days of week (Sunday - Saturday)
    // - MONTH: Weeks of month (สัปดาห์ที่ 1 - 5)
    const chartData = useMemo((): ChartDataPoint[] => {
        if (filter === 'TODAY') {
            // รายวัน แกน x เป็นชั่วโมง
            const hourLabels = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'];
            const currentHour = new Date().getHours();

            const data: ChartDataPoint[] = hourLabels.map((label) => {
                const bucketH = parseInt(label.split(':')[0], 10);
                return {
                    label,
                    totalSales: 0,
                    billCount: 0,
                    isHighlight: Math.abs(currentHour - bucketH) <= 1,
                };
            });

            filteredTransactions.forEach((tx) => {
                if (tx.type === 'SALE') {
                    const txDate = new Date(tx.timestamp || tx.date);
                    const h = txDate.getHours();
                    let idx = 0;
                    if (h < 10) idx = 0;
                    else if (h < 12) idx = 1;
                    else if (h < 14) idx = 2;
                    else if (h < 16) idx = 3;
                    else if (h < 18) idx = 4;
                    else if (h < 20) idx = 5;
                    else if (h < 22) idx = 6;
                    else idx = 7;

                    const amount = (tx.cashAmount || 0) + (tx.transferAmount || 0);
                    data[idx].totalSales += amount;
                    data[idx].billCount += 1;
                }
            });

            return data;
        }

        if (filter === 'WEEK') {
            // รายสัปดาห์ แกน x เป็นวัน
            const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
            const todayIndex = new Date().getDay();

            const data: ChartDataPoint[] = dayNames.map((name, index) => ({
                label: name,
                totalSales: 0,
                billCount: 0,
                isHighlight: index === todayIndex,
            }));

            filteredTransactions.forEach((tx) => {
                if (tx.type === 'SALE') {
                    const date = new Date(tx.timestamp || tx.date);
                    const dayIndex = date.getDay();
                    const amount = (tx.cashAmount || 0) + (tx.transferAmount || 0);
                    data[dayIndex].totalSales += amount;
                    data[dayIndex].billCount += 1;
                }
            });

            return data;
        }

        // MONTH: รายเดือน แกน x เป็น สัปดาห์ที่
        const weekLabels = ['สัปดาห์ที่ 1', 'สัปดาห์ที่ 2', 'สัปดาห์ที่ 3', 'สัปดาห์ที่ 4', 'สัปดาห์ที่ 5'];
        const todayDate = new Date().getDate();
        let curWeek = 0;
        if (todayDate <= 7) curWeek = 0;
        else if (todayDate <= 14) curWeek = 1;
        else if (todayDate <= 21) curWeek = 2;
        else if (todayDate <= 28) curWeek = 3;
        else curWeek = 4;

        const data: ChartDataPoint[] = weekLabels.map((name, index) => ({
            label: name,
            totalSales: 0,
            billCount: 0,
            isHighlight: index === curWeek,
        }));

        filteredTransactions.forEach((tx) => {
            if (tx.type === 'SALE') {
                const date = new Date(tx.timestamp || tx.date);
                const dayOfMonth = date.getDate();
                let weekIdx = 0;
                if (dayOfMonth <= 7) weekIdx = 0;
                else if (dayOfMonth <= 14) weekIdx = 1;
                else if (dayOfMonth <= 21) weekIdx = 2;
                else if (dayOfMonth <= 28) weekIdx = 3;
                else weekIdx = 4;

                const amount = (tx.cashAmount || 0) + (tx.transferAmount || 0);
                data[weekIdx].totalSales += amount;
                data[weekIdx].billCount += 1;
            }
        });

        return data;
    }, [filter, filteredTransactions]);

    // Backwards-compatible dailySalesData
    const dailySalesData: DailySalesData[] = useMemo(() => {
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
        const todayIndex = new Date().getDay();

        const weekData: DailySalesData[] = dayNames.map((name, index) => ({
            dayName: name,
            dayIndex: index,
            totalSales: 0,
            billCount: 0,
            isCurrentDay: index === todayIndex,
        }));

        transactions.forEach((tx) => {
            if (tx.type === 'SALE') {
                const date = new Date(tx.timestamp || tx.date);
                const dayIndex = date.getDay();
                const amount = (tx.cashAmount || 0) + (tx.transferAmount || 0);
                weekData[dayIndex].totalSales += amount;
                weekData[dayIndex].billCount += 1;
            }
        });

        return weekData;
    }, [transactions]);

    // Calculate best selling items
    const topSellingItems = useMemo(() => {
        const itemMap = new Map<string, { quantity: number; totalAmount: number }>();

        filteredTransactions.forEach((tx) => {
            if (tx.type === 'SALE' && tx.items) {
                tx.items.forEach((item) => {
                    const current = itemMap.get(item.name) || { quantity: 0, totalAmount: 0 };
                    itemMap.set(item.name, {
                        quantity: current.quantity + item.quantity,
                        totalAmount: current.totalAmount + item.price * item.quantity,
                    });
                });
            }
        });

        const items: BestSellingItem[] = [];
        let maxAmount = 0;

        itemMap.forEach((val, name) => {
            if (val.totalAmount > maxAmount) {
                maxAmount = val.totalAmount;
            }
            items.push({
                name,
                quantity: val.quantity,
                totalAmount: val.totalAmount,
                percentage: 0,
            });
        });

        // Sort descending by totalAmount
        items.sort((a, b) => b.totalAmount - a.totalAmount);

        // Calculate percentage for progress bars
        items.forEach((item) => {
            item.percentage = maxAmount > 0 ? Math.round((item.totalAmount / maxAmount) * 100) : 0;
        });

        return items.slice(0, 5);
    }, [filteredTransactions]);

    // Add new sale from POS
    const addSaleTransaction = ({
        billNumber: customBillNumber,
        items,
        subtotal,
        vat,
        total,
        paymentMethod,
        received,
        change,
        table,
        performedBy = 'วิชัย ใจดี',
    }: {
        billNumber?: number;
        items: BillItem[];
        subtotal: number;
        vat: number;
        total: number;
        paymentMethod: PaymentMethod;
        received?: number;
        change?: number;
        table?: string;
        performedBy?: string;
    }): SaleTransaction => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        let billNumber = customBillNumber;
        if (!billNumber) {
            const currentCounter = parseInt(localStorage.getItem(BILL_COUNTER_KEY) || '0', 10) + 1;
            localStorage.setItem(BILL_COUNTER_KEY, currentCounter.toString());
            billNumber = currentCounter;
        }

        const isCash = paymentMethod === 'CASH';

        const newTx: SaleTransaction = {
            id: `tx-sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'SALE',
            time: timeStr,
            date: dateStr,
            timestamp: now.getTime(),
            billNumber,
            description: `บิล #${billNumber}`,
            cashAmount: isCash ? total : 0,
            transferAmount: !isCash ? total : 0,
            paymentMethod,
            performedBy,
            table: table || 'กลับบ้าน',
            items,
            subtotal,
            vat,
            total,
            received: received ?? total,
            change: change ?? 0,
        };

        setTransactions((prev) => [newTx, ...prev]);
        return newTx;
    };

    // Add cash movement (in / out)
    const addCashMovement = (
        type: 'CASH_IN' | 'CASH_OUT',
        amount: number,
        description: string,
        performedBy = 'วิชัย ใจดี'
    ): SaleTransaction => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const isCashOut = type === 'CASH_OUT';
        const finalCashAmount = isCashOut ? -Math.abs(amount) : Math.abs(amount);

        const newTx: SaleTransaction = {
            id: `tx-cash-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type,
            time: timeStr,
            date: dateStr,
            timestamp: now.getTime(),
            description: description.trim() || (isCashOut ? 'นำเงินออก' : 'นำเงินเข้า'),
            cashAmount: finalCashAmount,
            transferAmount: 0,
            performedBy,
        };

        setTransactions((prev) => [newTx, ...prev]);
        return newTx;
    };

    return (
        <SalesContext.Provider
            value={{
                transactions,
                filteredTransactions,
                filter,
                setFilter,
                addSaleTransaction,
                addCashMovement,
                metrics,
                chartTitle,
                chartData,
                dailySalesData,
                topSellingItems,
            }}
        >
            {children}
        </SalesContext.Provider>
    );
}

export function useSales() {
    const context = useContext(SalesContext);
    if (!context) {
        throw new Error('useSales must be used within a SalesProvider');
    }
    return context;
}
