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

function Row({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
    return (
        <div className={`flex justify-between ${bold ? 'font-semibold text-[#2D241E]' : ''}`}>
            <span>{label}</span>
            <span>{baht(value)}</span>
        </div>
    );
}

export default function ExampleCard({ vatEnabled, vatRate, serviceRate }: ExampleCardProps) {
    const r = calcExample(vatEnabled, vatRate, serviceRate);

    return (
        <div className="w-72 rounded-xl border border-[#B79479] bg-[#F3EADF] p-4 text-sm text-stone-700">
            <p className="mb-3 font-semibold text-[#2D241E]">ตัวอย่าง</p>

            <div className="space-y-1">
                <Row label="ยอดอาหาร" value={r.food} />
                {serviceRate > 0 && <Row label={`ค่าบริการ ${serviceRate}%`} value={r.service} />}
            </div>

            <hr className="my-2 border-[#B79479]" />
            <Row label="ลูกค้าจ่าย" value={r.total} bold />

            {vatEnabled && (
                <div className="mt-3 space-y-1 border-t border-dashed border-stone-300 pt-2 text-xs text-stone-500">
                    <p>ในยอดนี้มี</p>
                    <Row label="มูลค่าก่อน VAT" value={r.beforeVat} />
                    <Row label={`VAT ${vatRate}%`} value={r.vat} />
                </div>
            )}
        </div>
    );
}