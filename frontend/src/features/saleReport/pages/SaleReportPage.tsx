import { useState } from 'react';
import Header from '../../../components/Header';
import SalesHeader from '../components/SalesHeader';
import SalesMetricsCards from '../components/SalesMetricsCards';
import CashMovementForm from '../components/CashMovementForm';
import SalesTransactionTable from '../components/SalesTransactionTable';
import DailySalesChart from '../components/DailySalesChart';
import TopSellingList from '../components/TopSellingList';
import { useSales } from '../context/SalesContext';
import { BarChart3, Receipt } from 'lucide-react';

export default function SaleReportPage() {
    const { filteredTransactions } = useSales();
    const [mobileTab, setMobileTab] = useState<'overview' | 'transactions'>('overview');

    return (
        <div className="min-h-screen bg-[#FAF7F2] flex flex-col font-kanit text-[#2D241E]">
            <Header />

            <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-5">
                {/* Header with Title & Filter Pills */}
                <SalesHeader />

                {/* ── Mobile View: 3 KPI Cards ด้านบนสุด (< lg) ── */}
                <div className="block lg:hidden">
                    <SalesMetricsCards />
                </div>

                {/* ── Mobile View: Segmented Tab Bar (< lg) ── */}
                <div className="flex lg:hidden bg-stone-200/60 p-1 rounded-2xl gap-1">
                    <button
                        type="button"
                        onClick={() => setMobileTab('overview')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                            mobileTab === 'overview'
                                ? 'bg-white text-[#8C6D58] shadow-xs font-semibold'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <BarChart3 className="w-4 h-4 stroke-[2]" />
                        <span>ภาพรวม & เมนูขายดี</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('transactions')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                            mobileTab === 'transactions'
                                ? 'bg-white text-[#8C6D58] shadow-xs font-semibold'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <Receipt className="w-4 h-4 stroke-[2]" />
                        <span>ประวัติธุรกรรม</span>
                        <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                mobileTab === 'transactions'
                                    ? 'bg-[#8C6D58]/10 text-[#8C6D58]'
                                    : 'bg-stone-300/60 text-stone-600'
                            }`}
                        >
                            {filteredTransactions.length}
                        </span>
                    </button>
                </div>

                {/* ── Mobile View: Content ตามแท็บที่เลือก (< lg) ── */}
                <div className="flex flex-col gap-4 lg:hidden">
                    {mobileTab === 'overview' ? (
                        <>
                            <DailySalesChart />
                            <TopSellingList />
                        </>
                    ) : (
                        <>
                            <CashMovementForm />
                            <SalesTransactionTable />
                        </>
                    )}
                </div>

                {/* ── Desktop View: Main Content Grid 2 คอลัมน์ (lg ขึ้นไป) ── */}
                <div className="hidden lg:grid grid-cols-12 gap-5 items-start">
                    {/* Left Column (8 cols on large screens) */}
                    <div className="col-span-8 flex flex-col gap-4">
                        <SalesMetricsCards />
                        <CashMovementForm />
                        <SalesTransactionTable />
                    </div>

                    {/* Right Column (4 cols on large screens) */}
                    <div className="col-span-4 flex flex-col gap-4">
                        <DailySalesChart />
                        <TopSellingList />
                    </div>
                </div>
            </main>
        </div>
    );
}
