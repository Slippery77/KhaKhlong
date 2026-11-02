import { Receipt, Info, Sparkles } from 'lucide-react';

interface ExampleCardProps {
    vatEnabled: boolean;   // true เฉพาะโหมด inclusive
    vatRate: number;
    serviceRate: number;
}

const SAMPLE_FOOD_SATANG = 100_000;   // 1,000.00 บาท

// pure function: ไม่มี state ไม่เรียก API ให้ค่าเดิมทุกครั้งที่ input เดิม
function calcExample(vatEnabled: boolean, vatRate: number, serviceRate: number) {
    const food = SAMPLE_FOOD_SATANG;
    const service = Math.round(food * serviceRate / 100);
    const total = food + service;
    const vat = vatEnabled ? Math.round(total - total * 100 / (100 + vatRate)) : 0;
    const beforeVat = total - vat - service;
    return { food, service, total, vat, beforeVat };
}

const baht = (satang: number) =>
    (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ReceiptRow({
    label,
    value,
    bold = false,
    highlight = false,
}: {
    label: string;
    value: number;
    bold?: boolean;
    highlight?: boolean;
}) {
    return (
        <div
            className={`flex justify-between items-center text-sm ${
                highlight
                    ? 'font-bold text-[#8C6D58] text-base py-1'
                    : bold
                        ? 'font-semibold text-[#2D241E]'
                        : 'text-stone-600'
            }`}
        >
            <span>{label}</span>
            <span className="font-mono tabular-nums">฿{baht(value)}</span>
        </div>
    );
}

export default function ExampleCard({ vatEnabled, vatRate, serviceRate }: ExampleCardProps) {
    const r = calcExample(vatEnabled, vatRate, serviceRate);

    return (
        <section className="w-full bg-white border border-[#E8DFD5] rounded-2xl shadow-xs overflow-hidden font-kanit">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58] shrink-0">
                        <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-semibold text-[#2D241E]">ตัวอย่างการคำนวณบิล</h3>
                        <p className="text-xs text-stone-500">จำลองออเดอร์ยอดอาหาร 1,000.00 บาท</p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3 h-3" />
                    คำนวณสด
                </span>
            </div>

            {/* Receipt Body */}
            <div className="p-5 space-y-4">
                <div className="space-y-2 bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DFD5]/80">
                    <ReceiptRow label="ยอดรวมค่าอาหาร" value={r.food} />
                    {serviceRate > 0 ? (
                        <ReceiptRow label={`ค่าบริการ Service Charge (${serviceRate}%)`} value={r.service} />
                    ) : (
                        <div className="flex justify-between items-center text-xs text-stone-400 py-0.5">
                            <span>ค่าบริการ (Service Charge)</span>
                            <span className="font-mono">ไม่คิด (0%)</span>
                        </div>
                    )}

                    <div className="border-t border-[#d9c6b0] my-2 pt-2">
                        <ReceiptRow label="ยอดรวมที่ลูกค้าจ่าย" value={r.total} bold highlight />
                    </div>
                </div>

                {/* VAT breakdown */}
                {vatEnabled ? (
                    <div className="space-y-2 rounded-xl bg-amber-50/60 border border-amber-200/60 p-3.5 text-xs text-stone-600">
                        <div className="flex items-center justify-between font-medium text-amber-900 border-b border-amber-200/50 pb-1.5">
                            <span className="flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                ในยอดนี้รวมภาษีมูลค่าเพิ่มแล้ว (VAT Inclusive)
                            </span>
                        </div>
                        <div className="space-y-1.5 pt-0.5">
                            <div className="flex justify-between text-stone-600">
                                <span>มูลค่าสินค้าก่อน VAT:</span>
                                <span className="font-mono tabular-nums">฿{baht(r.beforeVat)}</span>
                            </div>
                            <div className="flex justify-between text-stone-700 font-semibold">
                                <span>ภาษีมูลค่าเพิ่ม VAT ({vatRate}%):</span>
                                <span className="font-mono tabular-nums text-amber-800">฿{baht(r.vat)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-xs text-stone-500 flex items-center gap-2">
                        <Info className="w-4 h-4 text-stone-400 shrink-0" />
                        <span>ร้านไม่ได้เปิดคิดภาษีมูลค่าเพิ่ม (VAT 0%)</span>
                    </div>
                )}

                <p className="text-[11px] text-stone-400 leading-relaxed text-center">
                    ระบบจะนำอัตรานี้ไปคำนวณและแสดงผลในใบเสร็จของแคชเชียร์โดยอัตโนมัติ
                </p>
            </div>
        </section>
    );
}
