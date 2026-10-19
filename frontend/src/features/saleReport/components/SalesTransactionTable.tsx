import { useState } from 'react';
import { useSales } from '../context/SalesContext';
import type { SaleTransaction } from '../types/sales.types';
import BillDetailModal from './BillDetailModal';
import { Receipt } from 'lucide-react';

export default function SalesTransactionTable() {
    const { filteredTransactions, filter } = useSales();
    const [selectedBill, setSelectedBill] = useState<SaleTransaction | null>(null);

    // Format date and time according to filter requirement:
    // If TODAY: show only time (e.g. 23:00)
    // If WEEK or MONTH: show วัน/เดือน/ปี (e.g. 17/10/2026 23:00)
    const formatDateTime = (dateStr: string, timeStr: string) => {
        if (filter === 'TODAY') {
            return timeStr;
        }
        const [y, m, d] = (dateStr || '').split('-');
        if (y && m && d) {
            return `${d}/${m}/${y} ${timeStr}`;
        }
        return `${dateStr} ${timeStr}`;
    };

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden font-kanit flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-stone-200/80 text-[13px] font-medium text-stone-600 bg-stone-50/50">
                            <th className="py-3 px-5 whitespace-nowrap">
                                {filter === 'TODAY' ? 'เวลา' : 'วันที่ / เวลา'}
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
                                const isExpense = tx.type === 'CASH_OUT';
                                const isSale = tx.type === 'SALE';
                                const isCashIn = tx.type === 'CASH_IN';

                                return (
                                    <tr
                                        key={tx.id}
                                        onClick={() => {
                                            if (isSale) {
                                                setSelectedBill(tx);
                                            }
                                        }}
                                        className={`transition-colors ${
                                            isSale
                                                ? 'hover:bg-stone-50/80 cursor-pointer'
                                                : 'hover:bg-stone-50/40'
                                        }`}
                                    >
                                        {/* เวลา หรือ วัน/เดือน/ปี เวลา */}
                                        <td className="py-3.5 px-5 text-stone-600 font-normal whitespace-nowrap">
                                            {formatDateTime(tx.date, tx.time)}
                                        </td>

                                        {/* ประเภท Badge */}
                                        <td className="py-3.5 px-5 whitespace-nowrap">
                                            {isExpense && (
                                                <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium bg-[#FCE8E6] text-[#C53030]">
                                                    นำเงินออก
                                                </span>
                                            )}
                                            {isCashIn && (
                                                <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium bg-[#E6F4EA] text-[#1E7E34]">
                                                    นำเงินเข้า
                                                </span>
                                            )}
                                            {isSale && (
                                                <span className="inline-block px-3.5 py-0.5 rounded-full text-xs font-medium bg-[#EFE8DD] text-[#7A6048]">
                                                    ขาย
                                                </span>
                                            )}
                                        </td>

                                        {/* รายละเอียด */}
                                        <td className="py-3.5 px-5 text-stone-800 font-medium whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span>{tx.description}</span>
                                                {isSale && (
                                                    <span className="text-[11px] text-[#A68874] underline opacity-0 group-hover:opacity-100">
                                                        ดูบิล
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* เงินสด */}
                                        <td className="py-3.5 px-5 text-right font-semibold whitespace-nowrap">
                                            {isExpense ? (
                                                <span className="text-[#C53030]">
                                                    -฿{Math.abs(tx.cashAmount).toLocaleString()}
                                                </span>
                                            ) : tx.cashAmount > 0 ? (
                                                <span className="text-[#2D241E]">
                                                    +฿{tx.cashAmount.toLocaleString()}
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
                                            {tx.performedBy || 'วิชัย ใจดี'}
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
