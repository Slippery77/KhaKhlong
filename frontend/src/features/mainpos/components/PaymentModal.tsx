import { useState } from 'react';
import { X, Banknote, QrCode, CheckCircle2 } from 'lucide-react';
import type { CartMenu } from '../types/pos.types';
import type { PaymentMethod } from '../../saleReport/types/sales.types';
import { useSales } from '../../saleReport/context/SalesContext';

interface PaymentModalProps {
    table: string;
    cartMenu: CartMenu[];
    onClose: () => void;
    onPaymentSuccess: (billDesc: string) => void;
}

export default function PaymentModal({
    table,
    cartMenu,
    onClose,
    onPaymentSuccess,
}: PaymentModalProps) {
    const { addSaleTransaction } = useSales();
    const [method, setMethod] = useState<PaymentMethod>('CASH');

    const subtotal = cartMenu.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );
    const vat = (subtotal * 7) / 100;
    const grandTotal = Math.round((subtotal + vat) * 100) / 100;

    const [receivedAmount, setReceivedAmount] = useState<number>(grandTotal);
    const [customReceived, setCustomReceived] = useState<string>(grandTotal.toString());

    const change = Math.max(0, receivedAmount - grandTotal);
    const isEnough = method === 'TRANSFER' || receivedAmount >= grandTotal;

    const handleSelectAmount = (amt: number) => {
        setReceivedAmount(amt);
        setCustomReceived(amt.toString());
    };

    const handleCustomChange = (val: string) => {
        setCustomReceived(val);
        const parsed = parseFloat(val);
        setReceivedAmount(isNaN(parsed) ? 0 : parsed);
    };

    const handleConfirmPayment = () => {
        if (!isEnough) return;

        // Map cartMenu to BillItems
        const billItems = cartMenu.map((item) => ({
            id: item.cartItemId || item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedSpiciness: item.selectedSpiciness,
            selectedAddons: item.selectedAddons,
            note: item.note,
        }));

        const newTx = addSaleTransaction({
            items: billItems,
            subtotal,
            vat,
            total: grandTotal,
            paymentMethod: method,
            received: method === 'CASH' ? receivedAmount : grandTotal,
            change: method === 'CASH' ? change : 0,
            table,
            performedBy: 'วิชัย ใจดี',
        });

        onPaymentSuccess(newTx.description);
    };

    const quickCashOptions = [
        { label: 'พอดี', value: grandTotal },
        { label: '100', value: 100 },
        { label: '500', value: 500 },
        { label: '1,000', value: 1000 },
    ].filter((opt) => opt.value >= grandTotal || opt.label === 'พอดี');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-kanit animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-[#FAF7F2]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#EFE8DD] flex items-center justify-center text-[#8C6D58]">
                            <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-[#2D241E]">
                                ชำระเงิน ({table})
                            </h3>
                            <p className="text-xs text-stone-500">
                                {cartMenu.reduce((sum, item) => sum + item.quantity, 0)} รายการ
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Grand Total Display */}
                    <div className="text-center py-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-xs font-medium text-stone-400 block mb-1">
                            ยอดชำระสุทธิ
                        </span>
                        <div className="text-3xl font-bold text-[#2D241E]">
                            ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                            (ยอดรวม ฿{subtotal.toLocaleString()} + VAT 7% ฿{vat.toFixed(2)})
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                        <label className="text-xs font-semibold text-stone-500 mb-2 block">
                            เลือกช่องทางการชำระ
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setMethod('CASH');
                                    setReceivedAmount(grandTotal);
                                    setCustomReceived(grandTotal.toString());
                                }}
                                className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                                    method === 'CASH'
                                        ? 'border-[#A68874] bg-[#FAF7F2] text-[#8C6D58] ring-2 ring-[#A68874]/20'
                                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                                }`}
                            >
                                <Banknote className="w-5 h-5" />
                                <div>
                                    <div className="font-semibold text-sm">เงินสด</div>
                                    <div className="text-xs text-stone-400">Cash</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMethod('TRANSFER')}
                                className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                                    method === 'TRANSFER'
                                        ? 'border-[#A68874] bg-[#FAF7F2] text-[#8C6D58] ring-2 ring-[#A68874]/20'
                                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                                }`}
                            >
                                <QrCode className="w-5 h-5" />
                                <div>
                                    <div className="font-semibold text-sm">สแกน QR / เงินโอน</div>
                                    <div className="text-xs text-stone-400">PromptPay / Transfer</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Method details: Cash vs Transfer */}
                    {method === 'CASH' ? (
                        <div className="space-y-3 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/60">
                            <label className="text-xs font-semibold text-stone-600 block">
                                รับเงินมา (บาท)
                            </label>

                            {/* Quick buttons */}
                            <div className="flex flex-wrap gap-2">
                                {quickCashOptions.map((opt) => (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => handleSelectAmount(opt.value)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                            receivedAmount === opt.value
                                                ? 'bg-[#A68874] text-white border-[#A68874]'
                                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                                        }`}
                                    >
                                        {opt.label === 'พอดี' ? 'พอดี' : `฿${opt.label}`}
                                    </button>
                                ))}
                            </div>

                            {/* Custom amount */}
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-medium">
                                    ฿
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={customReceived}
                                    onChange={(e) => handleCustomChange(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#A68874]/30"
                                />
                            </div>

                            {/* Change display */}
                            <div className="flex justify-between items-center pt-2 border-t border-stone-200/80">
                                <span className="text-xs font-medium text-stone-500">
                                    เงินทอน
                                </span>
                                <span className={`text-base font-bold ${
                                    receivedAmount >= grandTotal ? 'text-emerald-600' : 'text-rose-500'
                                }`}>
                                    {receivedAmount >= grandTotal
                                        ? `฿${change.toFixed(2)}`
                                        : 'จำนวนเงินไม่เพียงพอ'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200/60 flex flex-col items-center justify-center text-center">
                            <div className="w-28 h-28 bg-white border border-stone-200 rounded-xl flex items-center justify-center shadow-xs mb-2">
                                <QrCode className="w-20 h-20 text-[#2D241E]" />
                            </div>
                            <span className="text-xs font-medium text-stone-600">
                                สแกนจ่ายด้วยพร้อมเพย์ (PromptPay)
                            </span>
                            <span className="text-[11px] text-stone-400 mt-0.5">
                                ครัวบ้าน • 089-XXX-XXXX
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-stone-100 bg-[#FAF7F2] flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-100 text-stone-600 font-medium text-sm rounded-xl transition cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmPayment}
                        disabled={!isEnough}
                        className="flex-1 py-2.5 bg-[#A68874] hover:bg-[#967763] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ยืนยันการชำระเงิน</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
