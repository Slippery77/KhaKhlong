import type { ReceiptData } from '../types/receipt.types';
import {
  formatMoney,
  formatThaiDateTime,
  paymentMethodLabel,
  receiptDocTitle,
  splitModifiers,
  vatLabel,
} from '../lib/receiptFormat';

interface ReceiptPaperProps {
  receipt: ReceiptData;
  /** true เมื่อการพิมพ์ครั้งนี้ไม่ใช่ครั้งแรก → ประทับคำว่า "สำเนา" */
  isCopy?: boolean;
  /** ลำดับการพิมพ์ (แสดงบนป้ายสำเนา) */
  printCount?: number;
  className?: string;
}

/** เส้นคั่นแบบใบเสร็จความร้อน */
function Divider({ className = '' }: { className?: string }) {
  return <div className={`border-t border-dashed border-[#8A837A] ${className}`} />;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-[9px] leading-[1.6]">
      <span className="shrink-0 text-[#5A544D]">{label}</span>
      <span className="min-w-0 break-words text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? 'flex items-baseline justify-between gap-2 pt-[1mm] text-[12px] font-bold'
          : 'flex items-baseline justify-between gap-2 text-[9px] leading-[1.6]'
      }
    >
      <span className={strong ? '' : 'text-[#3F3A34]'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * กระดาษใบเสร็จขนาด 80mm (พื้นที่พิมพ์ 72mm)
 * ใช้คอมโพเนนต์เดียวกันทั้งหน้าจอพรีวิวและแผ่นที่ส่งเข้าเครื่องพิมพ์
 */
export default function ReceiptPaper({
  receipt,
  isCopy = false,
  printCount,
  className = '',
}: ReceiptPaperProps) {
  const tableNumbers = Array.from(
    new Set(receipt.tables.map((t) => t.tableNumber).filter(Boolean)),
  );
  const orderNumbers = receipt.tables.map((t) => t.orderNumber).filter(Boolean);
  const showServiceCharge = receipt.serviceChargeRate > 0 || receipt.serviceChargeAmount > 0;
  const showVat = receipt.vatMode !== 'none' && receipt.vatAmount > 0;
  const showRounding = Math.abs(receipt.roundingAdjustment) >= 0.005;

  return (
    <article
      className={`receipt-paper w-[72mm] bg-white px-[3mm] py-[4mm] font-kanit text-[#1A1A1A] ${className}`}
    >
      {isCopy && (
        <div className="mb-[2mm] border border-dashed border-[#1A1A1A] px-[2mm] py-[1.2mm] text-center">
          <p className="text-[9px] font-bold tracking-[0.18em]">สำเนา</p>
          {printCount ? (
            <p className="mt-[0.4mm] text-[7.5px] leading-tight">พิมพ์ครั้งที่ {printCount}</p>
          ) : null}
        </div>
      )}

      {/* หัวใบเสร็จ: ข้อมูลร้านจาก server */}
      <header className="text-center">
        {receipt.store.name ? (
          <h1 className="text-[14px] leading-tight font-bold">{receipt.store.name}</h1>
        ) : null}
        {receipt.store.address ? (
          <p className="mt-[1.2mm] text-[8.5px] leading-[1.55] text-[#3F3A34]">
            {receipt.store.address}
          </p>
        ) : null}
        {receipt.store.phone ? (
          <p className="mt-[0.6mm] text-[8.5px] leading-[1.55] text-[#3F3A34]">
            โทร. {receipt.store.phone}
          </p>
        ) : null}
        {receipt.store.taxId ? (
          <p className="mt-[0.6mm] text-[8.5px] leading-[1.55] text-[#3F3A34]">
            เลขประจำตัวผู้เสียภาษี {receipt.store.taxId}
          </p>
        ) : null}
      </header>

      <Divider className="my-[2.5mm]" />

      <p className="text-center text-[10.5px] font-bold tracking-wide">
        {receiptDocTitle(receipt.vatMode)}
      </p>

      {/* ข้อมูลเอกสาร */}
      <div className="mt-[2mm] space-y-[0.4mm]">
        <MetaRow label="เลขที่" value={receipt.receiptNumber} />
        <MetaRow label="วันที่" value={formatThaiDateTime(receipt.paidAt)} />
        {tableNumbers.length > 0 ? (
          <MetaRow label="โต๊ะ" value={tableNumbers.join(', ')} />
        ) : null}
        {orderNumbers.length > 0 ? (
          <MetaRow label="บิล" value={orderNumbers.join(', ')} />
        ) : null}
        {receipt.cashier ? <MetaRow label="พนักงาน" value={receipt.cashier} /> : null}
      </div>

      <Divider className="my-[2.5mm]" />

      {/* รายการอาหาร — ยอดทุกบรรทัดมาจาก server */}
      <div className="space-y-[1.6mm]">
        {receipt.lines.length === 0 ? (
          <p className="py-[2mm] text-center text-[9px] text-[#5A544D]">ไม่มีรายการอาหาร</p>
        ) : (
          receipt.lines.map((line, index) => {
            const modifiers = splitModifiers(line.modifiers);
            return (
              <div key={`${line.name}-${index}`} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] leading-snug font-medium">
                    {line.name}
                    {line.isComped ? (
                      <span className="ml-[1mm] rounded-[1mm] border border-[#8A837A] px-[1mm] text-[7px] font-normal">
                        ฟรี
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[8.5px] leading-[1.5] text-[#5A544D] tabular-nums">
                    {line.qty} × {formatMoney(line.unitPrice)}
                  </p>
                  {modifiers.map((modifier) => (
                    <p
                      key={modifier}
                      className="text-[8px] leading-[1.5] text-[#5A544D]"
                    >
                      + {modifier}
                    </p>
                  ))}
                </div>
                <span className="shrink-0 text-right text-[9.5px] tabular-nums">
                  {line.isComped ? '0.00' : formatMoney(line.lineTotal)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <Divider className="my-[2.5mm]" />

      {/* สรุปยอด: ใช้ค่าจาก payments ตรง ๆ ไม่คำนวณซ้ำ */}
      <div className="space-y-[0.6mm]">
        <TotalRow label="ยอดรวม" value={formatMoney(receipt.subtotal)} />
        {showServiceCharge ? (
          <TotalRow
            label={
              receipt.serviceChargeRate > 0
                ? `ค่าบริการ ${receipt.serviceChargeRate}%`
                : 'ค่าบริการ'
            }
            value={formatMoney(receipt.serviceChargeAmount)}
          />
        ) : null}
        {showVat ? (
          <TotalRow
            label={vatLabel(receipt.vatMode, receipt.vatRate)}
            value={formatMoney(receipt.vatAmount)}
          />
        ) : null}
        {showRounding ? (
          <TotalRow
            label="ปัดเศษ"
            value={`${receipt.roundingAdjustment > 0 ? '+' : '-'}${formatMoney(
              Math.abs(receipt.roundingAdjustment),
            )}`}
          />
        ) : null}
      </div>

      <Divider className="my-[2mm]" />

      <TotalRow label="รวมทั้งสิ้น" value={formatMoney(receipt.totalAmount)} strong />

      <Divider className="my-[2.5mm]" />

      {/* การชำระเงิน */}
      <div className="space-y-[0.4mm]">
        <MetaRow label="ชำระโดย" value={paymentMethodLabel(receipt.paymentMethod)} />
        {receipt.cashReceived !== null ? (
          <MetaRow label="รับเงิน" value={formatMoney(receipt.cashReceived)} />
        ) : null}
        {receipt.changeAmount !== null ? (
          <MetaRow label="เงินทอน" value={formatMoney(receipt.changeAmount)} />
        ) : null}
      </div>

      <Divider className="my-[2.5mm]" />

      <footer className="text-center text-[8.5px] leading-[1.6] text-[#3F3A34]">
        <p className="font-semibold">ขอบคุณที่ใช้บริการ</p>
        <p>โปรดตรวจสอบรายการก่อนออกจากร้าน</p>
        {isCopy ? <p className="mt-[1mm]">เอกสารฉบับนี้เป็นสำเนา</p> : null}
      </footer>
    </article>
  );
}
