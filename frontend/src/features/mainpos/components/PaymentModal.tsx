import { useEffect, useState } from 'react';
import { X, Banknote, QrCode, CheckCircle2, Loader2, Info, Printer } from 'lucide-react';
import { usePayment } from '../hooks/usePayment';
import { ApiError } from '../../../libs/appClient';
import { ReceiptModal } from '../../receipt';
import type { PaymentAttempt, PaymentMethod, PaymentResult } from '../types/payment.type';
import { QRCodeSVG } from 'qrcode.react';


interface PaymentModalProps {
    table: string;
    /** บิลเดียว (หน้า POS) */
    orderId?: string;
    /** รวมโต๊ะคิดเงิน: บิลหลายใบในการชำระครั้งเดียว (ถ้ามีจะใช้แทน orderId) */
    orderIds?: string[];
    onClose: () => void;
    onPaymentSuccess: (receiptNumber: string) => void;
}

type Step = 'choose' | 'confirm' | 'done';

/** ยอดก่อนชำระที่ได้จาก server (บิลเดียวหรือหลายบิล) */
interface PreviewSummary {
    amount: number;
    itemCount: number;
}

const baht = (n: number) =>
    `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PaymentModal({ table, orderId, orderIds, onClose, onPaymentSuccess }: PaymentModalProps) {
    const { createAttempt, pay, cancel, getOrderSummary, getOrdersSummary } = usePayment();
    // key แบบ string กัน effect วนซ้ำเมื่อ parent สร้าง array ใหม่ทุก render
    const idsKey = (orderIds && orderIds.length > 0 ? orderIds : orderId ? [orderId] : []).join(',');
    const ids = idsKey ? idsKey.split(',') : [];
    const isMerged = ids.length > 1;

    const [step, setStep] = useState<Step>('choose');
    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
    const [result, setResult] = useState<PaymentResult | null>(null);
    const [cashInput, setCashInput] = useState('');
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // ยอดรวมก่อนชำระเงิน — ดึงจาก server เท่านั้น (client ไม่คำนวณ VAT/ยอดรวมเอง)
    const [summary, setSummary] = useState<PreviewSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    // เพิ่มค่าเพื่อสั่งโหลดยอดใหม่จาก event handler (ไม่ setState ใน effect โดยตรง)
    const [summaryReloadKey, setSummaryReloadKey] = useState(0);
    // เปิดหน้าต่างใบเสร็จหลังจ่ายเงินสำเร็จ (ยังไม่ปิดหน้าชำระเงิน)
    const [receiptOpen, setReceiptOpen] = useState(false);

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

    // โหลดยอดรวมล่าสุดของบิล (ทำใน promise callback เพื่อไม่ให้เกิด cascading render)
    useEffect(() => {
        let cancelled = false;
        const list = idsKey ? idsKey.split(',') : [];
        const request: Promise<PreviewSummary> =
            list.length > 1 ? getOrdersSummary(list) : getOrderSummary(list[0] ?? '');
        request
            .then((data) => {
                if (!cancelled) setSummary({ amount: data.amount, itemCount: data.itemCount });
            })
            .catch(() => {
                // แสดงสถานะ "ดึงยอดไม่ได้" โดยไม่บล็อกการชำระ เพราะยอดจริงยืนยันตอนสร้าง attempt
                if (!cancelled) setSummary(null);
            })
            .finally(() => {
                if (!cancelled) setSummaryLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [getOrderSummary, getOrdersSummary, idsKey, summaryReloadKey]);

    // เรียกจาก event handler: แสดง loading แล้วให้ effect ด้านบนโหลดยอดใหม่
    const reloadSummary = () => {
        setSummaryLoading(true);
        setSummaryReloadKey((key) => key + 1);
    };

    // หน้า 1: จองบิลและได้ยอดจาก server
    const handleNext = async () => {
        setLoading(true);
        setError(null);
        setPendingId(null);
        try {
            const a = await createAttempt(ids, method);
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
        // ยอดอาจเปลี่ยนระหว่างจองบิล → ดึงยอดล่าสุดมาแสดงใหม่
        reloadSummary();
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
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-[#FAF7F2]">
                    <h3 className="font-semibold text-base text-[#2D241E]">{isMerged ? 'ชำระเงินรวม' : 'ชำระเงิน'} ({table})</h3>
                    <button type="button" onClick={handleClose} disabled={loading}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* หน้า 1: เลือกวิธีจ่าย + ยอดรวมก่อนชำระเงิน */}
                    {step === 'choose' && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-[#E8DFD5] bg-[#FAF7F2] px-5 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <span className="block text-xs font-semibold text-stone-600">
                                            ยอดรวมก่อนชำระเงิน
                                        </span>
                                        <span className="mt-1 block text-[11px] text-stone-500">
                                            {summaryLoading ? (
                                                'กำลังคำนวณยอด...'
                                            ) : summary ? (
                                                isMerged
                                                    ? `${summary.itemCount.toLocaleString('th-TH')} รายการ · รวม ${ids.length} บิล`
                                                    : `${summary.itemCount.toLocaleString('th-TH')} รายการในบิล`
                                            ) : (
                                                <>
                                                    ดึงยอดรวมไม่สำเร็จ{' '}
                                                    <button
                                                        type="button"
                                                        onClick={reloadSummary}
                                                        className="font-semibold text-[#8C6D58] underline underline-offset-2 hover:text-[#6F5644] transition-colors cursor-pointer"
                                                    >
                                                        ลองใหม่
                                                    </button>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <div className="text-right shrink-0" aria-live="polite">
                                        {summaryLoading ? (
                                            <span className="block h-8 w-24 animate-pulse rounded-lg bg-stone-200/80" />
                                        ) : (
                                            <span className="text-2xl font-bold tabular-nums text-[#2D241E]">
                                                {summary ? baht(summary.amount) : '—'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-3 border-t border-[#E8DFD5] pt-2 text-[11px] leading-relaxed text-stone-500">
                                    ยอดนี้คำนวณจากรายการในบิลบนเซิร์ฟเวอร์ และจะยืนยันอีกครั้งเมื่อเริ่มชำระเงิน
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    { value: 'cash', label: 'เงินสด', sub: 'Cash', Icon: Banknote },
                                    { value: 'qr_code', label: 'สแกน QR', sub: 'PromptPay', Icon: QrCode },
                                ] as const).map(({ value, label, sub, Icon }) => (
                                    <button key={value} type="button" onClick={() => setMethod(value)}
                                        aria-pressed={method === value}
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
                        </div>
                    )}

                    {/* หน้า 2: ยืนยัน */}
                    {step === 'confirm' && (
                        <>
                            <div className="text-center py-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD5]">
                                <span className="text-xs font-medium text-stone-500 block mb-1">ยอดชำระสุทธิ</span>
                                <div className="text-3xl font-bold tabular-nums text-[#2D241E]">{baht(amount)}</div>
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
                                <div className="rounded-2xl border border-[#E8DFD5] bg-[#FAF7F2] p-4">
                                    {/* หัวการ์ด: ชื่อวิธีจ่าย + ยอดที่ต้องโอน */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFE8DC] text-[#8C6D58]">
                                                <QrCode className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[#2D241E]">สแกนเพื่อชำระเงิน</p>
                                                <p className="text-[11px] text-stone-500">พร้อมเพย์ · PromptPay</p>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded-full border border-[#E8DFD5] bg-white px-3 py-1 text-xs font-semibold tabular-nums text-[#8C6D58]">
                                            {baht(amount)}
                                        </span>
                                    </div>

                                    {/* ตัว QR บนพื้นขาว + quiet zone ให้สแกนง่าย */}
                                    <div className="mt-4 flex flex-col items-center">
                                        {attempt?.qrPayload ? (
                                            <div
                                                role="img"
                                                aria-label={`QR พร้อมเพย์สำหรับชำระ ${baht(amount)}`}
                                                className="rounded-2xl border border-[#E8DFD5] bg-white p-3 shadow-sm"
                                            >
                                                <QRCodeSVG
                                                    value={attempt.qrPayload}
                                                    size={176}
                                                    level="M"
                                                    fgColor="#2D241E"
                                                    bgColor="#FFFFFF"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#d9c6b0] bg-white px-4 text-center">
                                                <QrCode className="h-10 w-10 text-[#d9c6b0]" aria-hidden="true" />
                                                <p className="text-xs font-semibold text-[#2D241E]">สร้าง QR ไม่สำเร็จ</p>
                                                <p className="text-[11px] leading-relaxed text-stone-500">
                                                    ตรวจสอบเลขพร้อมเพย์ของร้านในหน้าตั้งค่า แล้วกลับมาลองใหม่
                                                </p>
                                            </div>
                                        )}

                                        <ol className="mt-4 w-full space-y-2">
                                            {[
                                                'เปิดแอปธนาคาร แล้วเลือกสแกน QR',
                                                'สแกนภาพนี้ ตรวจชื่อบัญชีร้านและยอดให้ตรงกัน',
                                                'กดยืนยันในแอป แล้วกลับมากด “ยืนยันรับเงิน”',
                                            ].map((text, index) => (
                                                <li
                                                    key={text}
                                                    className="flex items-start gap-2.5 text-[11px] leading-relaxed text-stone-600"
                                                >
                                                    <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EFE8DC] text-[10px] font-semibold text-[#8C6D58]">
                                                        {index + 1}
                                                    </span>
                                                    <span>{text}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2">
                                        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                                        <p className="text-[11px] leading-relaxed text-amber-800">
                                            ยอดใน QR ถูกกำหนดจากเซิร์ฟเวอร์แล้ว ตรวจว่าเงินเข้าแอปธนาคารของร้านก่อนกดยืนยัน
                                        </p>
                                    </div>
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
                        <>
                            <button type="button" onClick={handleClose}
                                className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-100 text-stone-600 font-medium text-sm rounded-xl transition cursor-pointer">
                                เสร็จสิ้น
                            </button>
                            <button type="button" onClick={() => setReceiptOpen(true)}
                                className="flex-1 py-2.5 bg-[#A68874] hover:bg-[#967763] text-white font-medium text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                                <Printer className="w-4 h-4" />
                                พิมพ์ใบเสร็จ
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* เปิดซ้อนเหนือหน้าชำระเงิน (portal ไปที่ body) — ปิดแล้วยังกด "เสร็จสิ้น" ได้ */}
            {receiptOpen && result && (
                <ReceiptModal
                    paymentId={result.paymentId}
                    onClose={() => setReceiptOpen(false)}
                />
            )}
        </div>
    );
}