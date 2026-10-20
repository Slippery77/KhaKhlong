import Header from '../../../components/Header';
import SalesHeader from '../components/SalesHeader';
import SalesMetricsCards from '../components/SalesMetricsCards';
import CashMovementForm from '../components/CashMovementForm';
import SalesTransactionTable from '../components/SalesTransactionTable';
import DailySalesChart from '../components/DailySalesChart';
import TopSellingList from '../components/TopSellingList';

export default function SaleReportPage() {
    return (
        <div className="min-h-screen bg-[#FAF7F2] flex flex-col font-kanit text-[#2D241E]">
            <Header />

            <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
                {/* Header with Title & Filter Pills */}
                <SalesHeader />

                {/* Main Content Grid: Left has 3 KPI cards + Form + Table; Right has Chart pushed to top + Best sellers */}
                <div className="grid grid-cols-12 gap-5 items-start">
                    {/* Left Column (8 cols on large screens) */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                        {/* 3 KPI Summary Cards (เงินสดคงเหลือ, รายรับ, รายจ่าย) */}
                        <SalesMetricsCards />

                        {/* Cash Movement Input Form */}
                        <CashMovementForm />

                        {/* Transaction History Table */}
                        <SalesTransactionTable />
                    </div>

                    {/* Right Column (4 cols on large screens) */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                        {/* Sales Bar Chart (Hourly / Daily / Weekly) */}
                        <DailySalesChart />

                        {/* Top Selling Dishes */}
                        <TopSellingList />
                    </div>
                </div>
            </main>
        </div>
    );
}
