import { useState } from 'react';
import { useSales } from '../context/SalesContext';
import type { SaleTransaction } from '../types/sales.types';
import BillDetailModal from './BillDetailModal';
import { Receipt, Download } from 'lucide-react';
import { exportTransactionsToCsv } from '../utils/exportCsv';

export default function SalesTransactionTable() {
    const { filteredTransactions, filter, viewMode, startDate, endDate } = useSales();
    const [selectedBill, setSelectedBill] = useState<SaleTransaction | null>(null);

    // Format date and time according to filter requirement:
    // If TODAY: show only time (e.g. 23:00)
    // If WEEK or MONTH or range: show วัน/เดือน/ปี (e.g. 17/10/2026 23:00)
    const formatDateTime = (dateStr: string, timeStr: string) => {
        if (viewMode === 'PERIOD' && filter === 'TODAY' && !startDate) {
            return timeStr;
        }
        const [y, m, d] = (dateStr || '').split('-');
        if (y && m && d) {
            return `${d}/${m}/${y} ${timeStr}`;
        }
        return `${dateStr} ${timeStr}`;
    };

    const handleExport = () => {
        const prefix = viewMode === 'SHIFT' 
            ? 'shift-transactions' 
            : startDate && endDate 
            ? `transactions-${startDate}-to-${endDate}` 
            : `transactions-${filter.toLowerCase()}`;
        exportTransactionsToCsv(filteredTransactions, prefix);
    };

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden font-kanit flex flex-col">
            {/* Table Header Action Bar */}
            <div className="px-5 py-3.5 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/40">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#2D241E]">ประวัติรายการธุรกรรม</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200/60 text-stone-600 font-medium">
                        {filteredTransactions.length} รายการ
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={filteredTransactions.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-stone-200 text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-[#8C6D58] hover:text-[#8C6D58] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-3.5 h-3.5 stroke-[2]" />
                    ส่งออก CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-stone-200/80 text-[13px] font-medium text-stone-600 bg-stone-50/50">
                            <th className="py-3 px-5 whitespace-nowrap">
                                {viewMode === 'PERIOD' && filter === 'TODAY' && !startDate ? 'เวลา' : 'วันที่ / เวลา'}
                            </th>
                            <th className="py-3 px-5 whitespace-nowrap">ประเภท</th>
                            <th className="py-3 px-5 whitespace-nowrap">รายละเอียด</th>
                            <th className="py-3 px-5 text-right whitespace-nowrap">เงินสด</th>
                            <th className="py-3 px-5 text-right whitespace-nowrap">เงินโอน</th>
                            <th className="py-3 px-5 text-right whitespace-nowrap">ผู้ทำรายการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-stone-400 text-sm">
                                    <Receipt className="w-8 h-8 mx-auto mb-2 text-stone-300 stroke-[1.5]" />
                                    ยังไม่มีรายการในรอบเวลานี้
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => {
                                const isSale = tx.type === 'SALE';
                                const isCashIn = tx.type === 'CASH_IN';

                                return (
                                    <tr
                                        key={tx.id}
                                        onClick={() => isSale && setSelectedBill(tx)}
                                        className={`transition-colors duration-150 ${
                                            isSale
                                                ? 'hover:bg-[#FAF7F2]/60 cursor-pointer'
                                                : 'hover:bg-stone-50/50'
                                        }`}
                                    >
                                        {/* เวลา / วันที่ */}
                                        <td className="py-3.5 px-5 text-stone-600 whitespace-nowrap font-normal">
                                            {formatDateTime(tx.date, tx.time)}
                                        </td>

                                        {/* ประเภท */}
                                        <td className="py-3.5 px-5 whitespace-nowrap">
                                            {isSale ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    การขาย
                                                </span>
                                            ) : isCashIn ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                                                    นำเงินเข้า
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                                    นำเงินออก
                                                </span>
                                            )}
                                        </td>

                                        {/* รายละเอียด */}
                                        <td className="py-3.5 px-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`font-medium ${
                                                        isSale ? 'text-[#8C6D58]' : 'text-[#2D241E]'
                                                    }`}
                                                >
                                                    {tx.description}
                                                </span>
                                                {tx.table && (
                                                    <span className="text-xs text-stone-400 font-normal">
                                                        ({tx.table})
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* เงินสด */}
                                        <td className="py-3.5 px-5 text-right font-semibold whitespace-nowrap">
                                            {tx.cashAmount > 0 ? (
                                                <span className="text-[#2D241E]">
                                                    +฿{tx.cashAmount.toLocaleString()}
                                                </span>
                                            ) : tx.cashAmount < 0 ? (
                                                <span className="text-rose-600">
                                                    -฿{Math.abs(tx.cashAmount).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-stone-400 font-normal">-</span>
                                            )}
                                        </td>

                                        {/* เงินโอน */}
                                        <td className="py-3.5 px-5 text-right font-semibold whitespace-nowrap">
                                            {tx.transferAmount > 0 ? (
                                                <span className="text-[#2D241E]">
                                                    +฿{tx.transferAmount.toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-stone-400 font-normal">-</span>
                                            )}
                                        </td>

                                        {/* ผู้ทำรายการ */}
                                        <td className="py-3.5 px-5 text-right text-stone-700 whitespace-nowrap font-normal">
                                            {tx.performedBy || 'พนักงาน'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bill Detail Popup */}
            {selectedBill && (
                <BillDetailModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
            )}
        </div>
    );
}
