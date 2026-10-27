import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { SaleTransaction, BillItem } from '../types/sales.types';
import { reportsApi } from '../api/reports.api';
import { useAuth } from '../../auth/context/AuthContext';
import { ReceiptModal } from '../../receipt';

interface BillDetailModalProps {
    bill: SaleTransaction | null;
    onClose: () => void;
}

export default function BillDetailModal({ bill, onClose }: BillDetailModalProps) {
    const { accessToken } = useAuth();
    const [fetchedItems, setFetchedItems] = useState<BillItem[] | null>(null);
    // เก็บเป็น paymentId เพื่อให้หน้าต่างใบเสร็จปิดเองเมื่อผู้ใช้สลับไปดูบิลอื่น
    const [receiptFor, setReceiptFor] = useState<string | null>(null);

    // Fetch items from backend if not embedded
    useEffect(() => {
        if (!bill) {
            setFetchedItems(null);
            return;
        }
        if (bill.items && bill.items.length > 0) {
            setFetchedItems(bill.items);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await reportsApi.getReceiptLines(accessToken, bill.id);
                if (!cancelled && res.data) {
                    setFetchedItems(res.data);
                }
            } catch {
                if (!cancelled) setFetchedItems([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [bill, accessToken]);
    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (bill) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [bill, onClose]);

    if (!bill) return null;

    // Format date and time to Thai Buddhist Era format (e.g. 19/10/2569 00:18:45)
    const formatBillDateTime = (tx: SaleTransaction) => {
        const pad = (n: number) => n.toString().padStart(2, '0');

        if (tx.timestamp && !isNaN(tx.timestamp)) {
            const d = new Date(tx.timestamp);
            const day = pad(d.getDate());
            const month = pad(d.getMonth() + 1);
            const year = d.getFullYear() + 543;
            const hours = pad(d.getHours());
            const minutes = pad(d.getMinutes());
            const seconds = pad(d.getSeconds());
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }

        if (tx.date) {
            const parts = tx.date.split('-');
            if (parts.length === 3) {
                const [y, m, d] = parts;
                const numericYear = parseInt(y, 10);
                const thaiYear = numericYear > 2400 ? numericYear : numericYear + 543;
                let timeStr = tx.time || '00:00:00';
                if (timeStr.length === 5) {
                    timeStr = `${timeStr}:00`;
                }
                return `${d}/${m}/${thaiYear} ${timeStr}`;
            }
        }

        return `${tx.date || ''} ${tx.time || ''}`.trim();
    };

    const formatPrice = (val?: number) => {
        if (val === undefined || val === null || isNaN(val)) return '0';
        if (Number.isInteger(val)) {
            return val.toLocaleString();
        }
        return Number(val.toFixed(2)).toLocaleString();
    };

    // Calculate totals
    const grandTotal =
        bill.total ?? (bill.cashAmount > 0 ? bill.cashAmount : bill.transferAmount) ?? 0;

    let subtotal = bill.subtotal;
    if (subtotal === undefined) {
        if (bill.items && bill.items.length > 0) {
            subtotal = bill.items.reduce(
                (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
                0
            );
        } else {
            subtotal = grandTotal;
        }
    }

    const vat = bill.vat !== undefined ? bill.vat : Math.max(0, grandTotal - subtotal);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden font-kanit">
            {/* Backdrop overlay */}
            <div
                onClick={onClose}
                className="fixed inset-0 bg-black/25 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200 cursor-pointer"
            />

            {/* Slide-over panel (Right Side Drawer as in Image 1) */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[340px] sm:max-w-[380px] bg-white shadow-2xl flex flex-col border-l border-stone-200/80 animate-in slide-in-from-right duration-250 ease-out">
                {/* Header Section */}
                <div className="p-6 pb-4 flex items-start justify-between">
                    <div>
                        <span className="text-xs text-stone-400 font-normal block mb-1">
                            รายละเอียดบิล
                        </span>
                        <h2 className="text-xl font-bold text-stone-800 leading-tight">
                            {bill.table || bill.description || `บิล #${bill.billNumber || 1}`}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิด"
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                    >
                        <X className="w-5 h-5 stroke-[2]" />
                    </button>
                </div>

                {/* Divider */}
                <div className="border-b border-stone-200/80" />

                {/* Date & Payment Metadata */}
                <div className="px-6 pt-5 pb-3 text-[13px] text-stone-500 space-y-1">
                    <p className="font-normal text-stone-600">{formatBillDateTime(bill)}</p>
                    <p className="text-stone-400">
                        <span>{bill.paymentMethod === 'TRANSFER' ? 'เงินโอน' : 'เงินสด'}</span>
                        <span className="mx-1.5">·</span>
                        <span>{bill.performedBy || 'วิชัย ใจดี'}</span>
                    </p>
                </div>

                {/* Bill Items List (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                    {(() => {
                        const itemsToRender = fetchedItems ?? bill.items ?? [];
                        if (itemsToRender.length === 0) {
                            return (
                                <p className="text-sm text-stone-400 py-6 text-center">
                                    ไม่มีรายการอาหาร
                                </p>
                            );
                        }
                        return itemsToRender.map((item, idx) => {
                            const itemTotal = (item.price || 0) * (item.quantity || 1);
                            const hasSpiciness = Boolean(item.selectedSpiciness);
                            const hasAddons = Boolean(
                                item.selectedAddons && item.selectedAddons.length > 0
                            );
                            const hasNote = Boolean(item.note);
                            const hasModifiers = hasSpiciness || hasAddons || hasNote;

                            return (
                                <div key={item.id || idx} className="text-sm">
                                    {/* Main item row */}
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium text-stone-800">
                                                {item.name}
                                            </span>
                                            <span className="text-stone-600 font-normal ml-1">
                                                ×{item.quantity}
                                            </span>
                                        </div>
                                        <span className="font-medium text-stone-800 whitespace-nowrap">
                                            ฿{formatPrice(itemTotal)}
                                        </span>
                                    </div>

                                    {/* Modifiers List (matching Image 2) */}
                                    {hasModifiers && (
                                        <div className="mt-1 space-y-0.5 text-xs text-stone-500 pl-0.5">
                                            {/* Spiciness modifier: • เผ็ดปกติ */}
                                            {hasSpiciness && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-stone-400">•</span>
                                                    <span>{item.selectedSpiciness}</span>
                                                </div>
                                            )}

                                            {/* Addon modifiers: • เพิ่มไข่ดาว +฿10 */}
                                            {hasAddons &&
                                                item.selectedAddons?.map((addon, aIdx) => {
                                                    const addonName =
                                                        typeof addon === 'string'
                                                            ? addon
                                                            : addon.name;
                                                    const addonPrice =
                                                        typeof addon === 'object' && addon.price
                                                            ? addon.price
                                                            : 0;

                                                    return (
                                                        <div
                                                            key={aIdx}
                                                            className="flex items-center gap-1.5"
                                                        >
                                                            <span className="text-stone-400">•</span>
                                                            <span>
                                                                {addonName}
                                                                {addonPrice > 0 &&
                                                                    ` +฿${formatPrice(addonPrice)}`}
                                                            </span>
                                                        </div>
                                                    );
                                                })}

                                            {/* Special note */}
                                            {hasNote && (
                                                <div className="flex items-center gap-1.5 text-stone-400 italic">
                                                    <span className="text-stone-300">•</span>
                                                    <span>หมายเหตุ: {item.note}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Financial Summary (matching Image 1) */}
                <div className="px-6 py-4 border-t border-stone-200/80 bg-white space-y-2">
                    {/* Subtotal */}
                    <div className="flex justify-between text-xs text-stone-500">
                        <span>ยอดรวม</span>
                        <span className="font-medium text-stone-700">
                            ฿{formatPrice(subtotal)}
                        </span>
                    </div>

                    {/* VAT */}
                    {vat > 0 && (
                        <div className="flex justify-between text-xs text-stone-500">
                            <span>VAT</span>
                            <span className="font-medium text-stone-700">
                                ฿{formatPrice(vat)}
                            </span>
                        </div>
                    )}

                    {/* Divider line before Total */}
                    <div className="border-t border-stone-200/80 my-2" />

                    {/* Grand Total */}
                    <div className="flex justify-between items-center pt-0.5">
                        <span className="font-bold text-sm text-stone-800">รวม</span>
                        <span className="font-bold text-base text-[#9E6B55]">
                            ฿{formatPrice(grandTotal)}
                        </span>
                    </div>

                    {/* Optional Cash received & change */}
                    {bill.received !== undefined &&
                        bill.received > 0 &&
                        bill.received !== grandTotal && (
                            <div className="flex justify-between text-xs text-stone-500 pt-1">
                                <span>รับเงินมา</span>
                                <span>฿{formatPrice(bill.received)}</span>
                            </div>
                        )}
                    {bill.change !== undefined && bill.change > 0 && (
                        <div className="flex justify-between text-xs text-emerald-600 font-medium">
                            <span>เงินทอน</span>
                            <span>฿{formatPrice(bill.change)}</span>
                        </div>
                    )}

                    {/* พิมพ์ซ้ำ: ยอดและรายการบนใบเสร็จดึงจาก /payments/:id/receipt ไม่ใช่ค่าที่คำนวณในหน้านี้ */}
                    <button
                        type="button"
                        onClick={() => setReceiptFor(bill.id)}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8C6D58] py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#7a5c45] focus-visible:ring-2 focus-visible:ring-[#A68874]/50 focus-visible:outline-none cursor-pointer"
                    >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        พิมพ์ใบเสร็จซ้ำ
                    </button>
                </div>
            </div>

            {receiptFor && (
                <ReceiptModal paymentId={receiptFor} onClose={() => setReceiptFor(null)} />
            )}
        </div>
    );
}
