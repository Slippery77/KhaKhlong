import { useState } from 'react';
import { X, Banknote, QrCode, CheckCircle2, Loader2 } from 'lucide-react';
import { usePayment } from '../hooks/usePayment';
import { ApiError } from '../../../libs/appClient';
import type { PaymentAttempt, PaymentMethod, PaymentResult } from '../types/payment.type';

interface PaymentModalProps {
    table: string;
    orderId: string;
    onClose: () => void;
    onPaymentSuccess: (receiptNumber: string) => void;
}

type Step = 'choose' | 'confirm' | 'done';

const baht = (n: number) =>
    `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PaymentModal({ table, orderId, onClose, onPaymentSuccess }: PaymentModalProps) {
    const { createAttempt, pay, cancel } = usePayment();

    const [step, setStep] = useState<Step>('choose');
    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
    const [result, setResult] = useState<PaymentResult | null>(null);
    const [cashInput, setCashInput] = useState('');
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ยอดมาจาก server เท่านั้น หน้าจอไม่คำนวณยอดเอง
    const amount = attempt?.amount ?? 0;
    const cashReceived = parseFloat(cashInput);
    // เช็คจากข้อความที่พิมพ์ ไม่ใช่ตัวเลข เพราะ floating point คำนวณเพี้ยน
    // backend รับทศนิยมไม่เกิน 2 ตำแหน่ง (@IsNumber maxDecimalPlaces: 2)
    const isTwoDecimals = /^\d+(\.\d{1,2})?$/.test(cashInput);
    const isCashEnough = isTwoDecimals && cashReceived >= amount;
    const canConfirm = method === 'qr_code' || isCashEnough;
    // เงินทอนตรงนี้ใช้แสดงผลระหว่างพิมพ์เท่านั้น ตัวเลขจริงมาจาก changeAmount หลัง /pay
    const previewChange = isCashEnough ? cashReceived - amount : 0;

    const showError = (e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');

    // หน้า 1: จองบิลและได้ยอดจาก server
    const handleNext = async () => {
        setLoading(true);
        setError(null);
        setPendingId(null);
        try {
            const a = await createAttempt([orderId], method);
            setAttempt(a);
            setCashInput(String(a.amount));
            setStep('confirm');
        } catch (e) {
            // บิลถูกล็อกโดยการชำระที่ค้างอยู่ (เช่นเครื่องอื่นเปิดค้างไว้)
            if (e instanceof ApiError && e.data?.code === 'PAYMENT_ATTEMPT_PENDING') {
                setPendingId(e.data.paymentAttemptId);
            }
            showError(e);
        } finally {
            setLoading(false);
        }
    };

    const handleClearPending = async () => {
        if (!pendingId) return;
        setLoading(true);
        try {
            await cancel(pendingId, 'ยกเลิกรายการชำระที่ค้างอยู่');
            setPendingId(null);
        } catch (e) {
            showError(e);
            setLoading(false);
            return;
        }
        await handleNext();
    };

    // หน้า 2: ยืนยันรับเงิน
    const handleConfirm = async () => {
        if (!attempt || !canConfirm) return;
        setLoading(true);
        setError(null);
        try {
            const r = await pay(attempt.paymentAttemptId, method === 'cash' ? cashReceived : undefined);
            setResult(r);
            setStep('done');
        } catch (e) {
            showError(e);
        } finally {
            setLoading(false);
        }
    };

    // ออกจากหน้า 2 โดยไม่จ่าย ต้องยกเลิก attempt ไม่งั้นบิลถูกล็อกค้างและปิดกะไม่ได้
    const releaseAttempt = async () => {
        if (attempt && step === 'confirm') {
            try {
                await cancel(attempt.paymentAttemptId, 'พนักงานปิดหน้าชำระเงิน');
            } catch {
                // ยกเลิกไม่สำเร็จไม่ควรขวางการปิดหน้าต่าง รายการยังยกเลิกจากเครื่องอื่นได้
            }
        }
    };

    const handleBack = async () => {
        await releaseAttempt();
        setAttempt(null);
        setError(null);
        setStep('choose');
    };

    const handleClose = async () => {
        if (step === 'done' && result) {
            onPaymentSuccess(result.receiptNumber);
            return;
        }
        await releaseAttempt();
        onClose();
    };

    const quickCash = [100, 500, 1000].filter((v) => v > amount);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-kanit">
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-[#FAF7F2]">
                    <h3 className="font-semibold text-base text-[#2D241E]">ชำระเงิน ({table})</h3>
                    <button type="button" onClick={handleClose} disabled={loading}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* หน้า 1: เลือกวิธีจ่าย */}
                    {step === 'choose' && (
                        <div className="grid grid-cols-2 gap-3">
                            {([
                                { value: 'cash', label: 'เงินสด', sub: 'Cash', Icon: Banknote },
                                { value: 'qr_code', label: 'สแกน QR', sub: 'PromptPay', Icon: QrCode },
                            ] as const).map(({ value, label, sub, Icon }) => (
                                <button key={value} type="button" onClick={() => setMethod(value)}
                                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                                        method === value
                                            ? 'border-[#A68874] bg-[#FAF7F2] text-[#8C6D58] ring-2 ring-[#A68874]/20'
                                            : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                                    }`}>
                                    <Icon className="w-5 h-5" />
                                    <div>
                                        <div className="font-semibold text-sm">{label}</div>
                                        <div className="text-xs text-stone-400">{sub}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* หน้า 2: ยืนยัน */}
                    {step === 'confirm' && (
                        <>
                            <div className="text-center py-4 bg-stone-50 rounded-2xl border border-stone-100">
                                <span className="text-xs font-medium text-stone-400 block mb-1">ยอดชำระสุทธิ</span>
                                <div className="text-3xl font-bold text-[#2D241E]">{baht(amount)}</div>
                            </div>

                            {method === 'cash' ? (
                                <div className="space-y-3 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/60">
                                    <label className="text-xs font-semibold text-stone-600 block">รับเงินมา (บาท)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[amount, ...quickCash].map((v, i) => (
                                            <button key={v} type="button" onClick={() => setCashInput(String(v))}
                                                className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white text-stone-700 border-stone-200 hover:bg-stone-100 cursor-pointer">
                                                {i === 0 ? 'พอดี' : baht(v)}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="number" min="0" step="0.01" value={cashInput}
                                        onChange={(e) => setCashInput(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#A68874]/30" />
                                    <div className="flex justify-between items-center pt-2 border-t border-stone-200/80">
                                        <span className="text-xs font-medium text-stone-500">เงินทอน</span>
                                        <span className={`text-base font-bold ${isCashEnough ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {isCashEnough ? baht(previewChange) : 'จำนวนเงินไม่เพียงพอ'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200/60 flex flex-col items-center text-center">
                                    {/* ยังไม่มี promptpay_id ของร้าน ขั้นถัดไปค่อยสร้าง QR จริง */}
                                    <QrCode className="w-24 h-24 text-[#2D241E] mb-2" />
                                    <span className="text-xs text-stone-600">
                                        ตรวจว่าเงินเข้าแอปธนาคารของร้านแล้ว ค่อยกดยืนยัน
                                    </span>
                                </div>
                            )}
                        </>
                    )}

                    {/* หน้า 3: สำเร็จ */}
                    {step === 'done' && result && (
                        <div className="text-center space-y-2 py-4">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                            <div className="font-semibold text-[#2D241E]">ชำระเงินสำเร็จ</div>
                            <div className="text-sm text-stone-500">ใบเสร็จเลขที่ {result.receiptNumber}</div>
                            <div className="text-sm text-stone-500">ยอด {baht(result.totalAmount)}</div>
                            {result.changeAmount !== null && (
                                <div className="text-lg font-bold text-emerald-600">เงินทอน {baht(result.changeAmount)}</div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                            {error}
                            {pendingId && (
                                <button type="button" onClick={handleClearPending} disabled={loading}
                                    className="block mt-2 text-xs font-semibold underline cursor-pointer">
                                    ยกเลิกรายการที่ค้างแล้วเริ่มใหม่
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100 bg-[#FAF7F2] flex gap-3">
                    {step === 'choose' && (
                        <button type="button" onClick={handleNext} disabled={loading}
                            className="flex-1 py-2.5 bg-[#A68874] hover:bg-[#967763] disabled:opacity-40 text-white font-medium text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            ถัดไป
                        </button>
                    )}
                    {step === 'confirm' && (
                        <>
                            <button type="button" onClick={handleBack} disabled={loading}
                                className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-100 text-stone-600 font-medium text-sm rounded-xl transition cursor-pointer">
                                ย้อนกลับ
                            </button>
                            <button type="button" onClick={handleConfirm} disabled={!canConfirm || loading}
                                className="flex-1 py-2.5 bg-[#A68874] hover:bg-[#967763] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                ยืนยันรับเงิน
                            </button>
                        </>
                    )}
                    {step === 'done' && (
                        <button type="button" onClick={handleClose}
                            className="flex-1 py-2.5 bg-[#A68874] hover:bg-[#967763] text-white font-medium text-sm rounded-xl transition cursor-pointer">
                            เสร็จสิ้น
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}