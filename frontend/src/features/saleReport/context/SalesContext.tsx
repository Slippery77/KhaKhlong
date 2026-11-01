/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, useMemo } from 'react';
import type {
    SaleTransaction,
    PaymentMethod,
    TimeFilter,
    ChartDataPoint,
    DailySalesData,
    BestSellingCategory,
    BillItem,
    ReportViewMode
} from '../types/sales.types';
import { reportsApi, type ReportQueryParams } from '../api/reports.api';
import { shiftsApi } from '../../shifts/api/shifts.api';
import type { Shift } from '../../shifts/types/shift.types';
import { useAuth } from '../../auth/context/AuthContext';

interface SalesContextType {
    transactions: SaleTransaction[];
    filteredTransactions: SaleTransaction[];
    filter: TimeFilter;
    setFilter: (f: TimeFilter) => void;
    // Enhanced Filters
    viewMode: ReportViewMode;
    setViewMode: (vm: ReportViewMode) => void;
    startDate: string;
    endDate: string;
    setDateRange: (start: string, end: string) => void;
    selectedShiftId: string;
    setSelectedShiftId: (id: string) => void;
    availableShifts: Shift[];
    isLoadingShifts: boolean;
    // Core actions
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
    ) => Promise<void>;
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
    topSellingCategories: BestSellingCategory[];
    refreshSales: () => Promise<void>;
    isLoading: boolean;
}

export const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function SalesProvider({ children }: { children: ReactNode }) {
    const { accessToken } = useAuth();
    const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
    const [remoteSummary, setRemoteSummary] = useState<any>(null);
    const [remoteChart, setRemoteChart] = useState<any[]>([]);
    const [remoteTop, setRemoteTop] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Filter states
    const [viewMode, setViewMode] = useState<ReportViewMode>('PERIOD');
    const [filter, setFilterState] = useState<TimeFilter>('WEEK');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedShiftId, setSelectedShiftId] = useState<string>('');
    const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
    const [isLoadingShifts, setIsLoadingShifts] = useState<boolean>(false);

    // Fetch shift list for dropdown
    useEffect(() => {
        if (!accessToken) return;
        let isMounted = true;
        const fetchShiftList = async () => {
            setIsLoadingShifts(true);
            try {
                const res = await shiftsApi.list(accessToken, { limit: 30 });
                const shiftItems = (res as any)?.data?.items || (Array.isArray(res?.data) ? res.data : []);
                if (isMounted) {
                    setAvailableShifts(shiftItems);
                    if (shiftItems.length > 0 && !selectedShiftId) {
                        setSelectedShiftId(shiftItems[0].shiftId);
                    }
                }
            } catch (err) {
                console.error('Failed to list shifts for report', err);
            } finally {
                if (isMounted) setIsLoadingShifts(false);
            }
        };
        fetchShiftList();
        return () => { isMounted = false; };
    }, [accessToken]);

    const setFilter = (f: TimeFilter) => {
        setFilterState(f);
        setStartDate('');
        setEndDate('');
    };

    const setDateRange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };

    const fetchData = useCallback(async () => {
        if (!accessToken) {
            setTransactions([]);
            setRemoteSummary(null);
            setRemoteChart([]);
            setRemoteTop([]);
            return;
        }
        setIsLoading(true);
        try {
            const queryParams: ReportQueryParams = {};
            if (viewMode === 'SHIFT') {
                if (selectedShiftId) {
                    queryParams.shiftId = selectedShiftId;
                } else {
                    queryParams.period = 'TODAY';
                }
            } else {
                if (startDate && endDate) {
                    queryParams.from = startDate;
                    queryParams.to = endDate;
                } else {
                    queryParams.period = filter;
                }
            }

            const [summaryRes, byPeriodRes, topRes, txRes] = await Promise.all([
                reportsApi.getSummary(accessToken, queryParams).catch(() => ({ data: null })),
                reportsApi.getByPeriod(accessToken, queryParams).catch(() => ({ data: [] })),
                reportsApi.getTopItems(accessToken, queryParams).catch(() => ({ data: [] })),
                reportsApi.getTransactions(accessToken, queryParams).catch(() => ({ data: [] })),
            ]);

            setRemoteSummary(summaryRes?.data || null);
            setRemoteChart(byPeriodRes?.data || []);
            setRemoteTop(topRes?.data || []);

            const txs = (txRes?.data || []).map((t: any) => ({
                id: t.id,
                type: t.type,
                time: t.time,
                date: t.date,
                timestamp: t.timestamp,
                billNumber: t.billNumber,
                description: t.description,
                cashAmount: t.cashAmount || 0,
                transferAmount: t.transferAmount || 0,
                paymentMethod: t.paymentMethod,
                performedBy: t.performedBy || 'พนักงาน',
                table: t.table,
                subtotal: t.subtotal,
                vat: t.vat,
                total: t.total,
                received: t.received,
                change: t.change,
            })) as SaleTransaction[];

            setTransactions(txs);
        } catch (e) {
            console.error('Failed to load sales report', e);
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, viewMode, filter, startDate, endDate, selectedShiftId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTransactions = transactions;

    // Metrics calculation
    const metrics = useMemo(() => {
        if (remoteSummary) {
            return {
                cashOnHand: Number(remoteSummary.cashOnHand || 0),
                totalIncome: Number(remoteSummary.totalIncome || 0),
                totalExpense: Number(remoteSummary.totalExpense || 0),
                cashSales: Number(remoteSummary.cashSales || 0),
                transferSales: Number(remoteSummary.transferSales || 0),
                totalBillsCount: Number(remoteSummary.totalBillsCount || 0),
            };
        }
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
    }, [filteredTransactions, transactions, remoteSummary]);

    // Chart title
    const chartTitle = useMemo(() => {
        if (viewMode === 'SHIFT') return 'ยอดขายตลอดกะ';
        if (startDate && endDate) return `ยอดขาย (${startDate} ถึง ${endDate})`;
        if (filter === 'TODAY') return 'ยอดขายรายชั่วโมง';
        if (filter === 'WEEK') return 'ยอดขายรายวัน';
        return 'ยอดขายรายสัปดาห์';
    }, [viewMode, startDate, endDate, filter]);

    // Chart Data Points
    const chartData = useMemo((): ChartDataPoint[] => {
        const now = new Date();
        if (viewMode === 'SHIFT' || filter === 'TODAY' || (startDate && startDate === endDate)) {
            const hourLabels = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'];
            const currentHour = now.getHours();

            const data: ChartDataPoint[] = hourLabels.map((label) => {
                const bucketH = parseInt(label.split(':')[0], 10);
                return {
                    label,
                    totalSales: 0,
                    billCount: 0,
                    isHighlight: Math.abs(currentHour - bucketH) <= 1,
                };
            });

            if (remoteChart && remoteChart.length > 0) {
                remoteChart.forEach((r: any) => {
                    const h = parseInt(r.label?.split(':')[0] || '0', 10);
                    let idx = 0;
                    if (h < 10) idx = 0;
                    else if (h < 12) idx = 1;
                    else if (h < 14) idx = 2;
                    else if (h < 16) idx = 3;
                    else if (h < 18) idx = 4;
                    else if (h < 20) idx = 5;
                    else if (h < 22) idx = 6;
                    else idx = 7;

                    data[idx].totalSales += Number(r.totalSales || r.total_sales || 0);
                    data[idx].billCount += Number(r.billCount || r.bill_count || 0);
                });
            }
            return data;
        }

        if (filter === 'WEEK') {
            const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
            const todayIndex = now.getDay();

            return dayNames.map((name, index) => {
                const found = remoteChart.find((r: any) => r.label === name || r.dayIndex === index);
                return {
                    label: name,
                    totalSales: found ? Number(found.totalSales || found.total_sales || 0) : 0,
                    billCount: found ? Number(found.billCount || found.bill_count || 0) : 0,
                    isHighlight: index === todayIndex,
                };
            });
        }

        // MONTH หรือช่วงวันที่อื่น ๆ
        const weekLabels = ['สัปดาห์ที่ 1', 'สัปดาห์ที่ 2', 'สัปดาห์ที่ 3', 'สัปดาห์ที่ 4', 'สัปดาห์ที่ 5'];
        const todayDate = now.getDate();
        let curWeek = 0;
        if (todayDate <= 7) curWeek = 0;
        else if (todayDate <= 14) curWeek = 1;
        else if (todayDate <= 21) curWeek = 2;
        else if (todayDate <= 28) curWeek = 3;
        else curWeek = 4;

        return weekLabels.map((name, index) => {
            const found = remoteChart.find((r: any) => r.label === name || r.w === index + 1);
            return {
                label: name,
                totalSales: found ? Number(found.totalSales || found.total_sales || 0) : 0,
                billCount: found ? Number(found.billCount || found.bill_count || 0) : 0,
                isHighlight: index === curWeek,
            };
        });
    }, [viewMode, filter, startDate, endDate, remoteChart]);

    // Backwards-compatible dailySalesData
    const dailySalesData: DailySalesData[] = useMemo(() => {
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
        const todayIndex = new Date().getDay();

        return dayNames.map((name, index) => {
            const chartPoint = chartData.find((d) => d.label === name);
            return {
                dayName: name,
                dayIndex: index,
                totalSales: chartPoint?.totalSales || 0,
                billCount: chartPoint?.billCount || 0,
                isCurrentDay: index === todayIndex,
            };
        });
    }, [chartData]);

    // Top selling items แยกตามหมวดหมู่ (top 3 ต่อหมวด)
    const topSellingCategories = useMemo((): BestSellingCategory[] => {
        const PER_CATEGORY = 3;

        const withPercentages = (items: BestSellingCategory['items']) => {
            if (items.every((i) => i.percentage === 0)) {
                const maxAmount = items.length ? Math.max(...items.map((i) => i.totalAmount)) : 0;
                items.forEach((item) => {
                    item.percentage = maxAmount > 0 ? Math.round((item.totalAmount / maxAmount) * 100) : 0;
                });
            }
            return items;
        };

        if (remoteTop && remoteTop.length > 0) {
            return remoteTop
                .filter((c) => Array.isArray(c?.items) && c.items.length > 0)
                .map((c) => {
                    const items = c.items.slice(0, PER_CATEGORY).map((r: any) => ({
                        name: r.name,
                        quantity: Number(r.quantity || 0),
                        totalAmount: Number(r.totalAmount ?? 0),
                        percentage: Number(r.percentage || 0),
                    }));

                    return {
                        categoryId: String(c.categoryId ?? ''),
                        categoryName: String(c.categoryName || 'ไม่ระบุหมวดหมู่'),
                        categoryTotal: Number(c.categoryTotal ?? 0),
                        items: withPercentages(items),
                    };
                });
        }
        return [];
    }, [remoteTop]);

    // Add cash movement (in / out) to backend
    const addCashMovement = async (
        type: 'CASH_IN' | 'CASH_OUT',
        amount: number,
        description: string,
        _performedBy = 'พนักงาน'
    ) => {
        const direction = type === 'CASH_OUT' ? 'out' : 'in';
        try {
            await reportsApi.createCashMovement(accessToken, {
                direction,
                amount: Math.abs(amount),
                reason: description.trim() || (direction === 'out' ? 'นำเงินออก' : 'นำเงินเข้า'),
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to create cash movement', err);
            throw err;
        }
    };

    // Add sale transaction fallback
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
        performedBy = 'พนักงาน',
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

        const isCash = paymentMethod === 'CASH';
        const newTx: SaleTransaction = {
            id: `tx-sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'SALE',
            time: timeStr,
            date: dateStr,
            timestamp: now.getTime(),
            billNumber: customBillNumber || 1,
            description: `บิล #${customBillNumber || 1}`,
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
        fetchData();
        return newTx;
    };

    return (
        <SalesContext.Provider
            value={{
                transactions,
                filteredTransactions,
                filter,
                setFilter,
                viewMode,
                setViewMode,
                startDate,
                endDate,
                setDateRange,
                selectedShiftId,
                setSelectedShiftId,
                availableShifts,
                isLoadingShifts,
                addSaleTransaction,
                addCashMovement,
                metrics,
                chartTitle,
                chartData,
                dailySalesData,
                topSellingCategories,
                refreshSales: fetchData,
                isLoading,
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
