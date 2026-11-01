import type { PaperSize, ReceiptData } from '../types/receipt.types';
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
  /** ขนาดกระดาษความร้อน: '80mm' (หน้ากว้าง 72mm) หรือ '58mm' (หน้ากว้าง 48mm) */
  paperSize?: PaperSize;
  /** ข้อความท้ายใบเสร็จ (ถ้าไม่ระบุ จะดึงจาก receipt.footer หรือข้อความเริ่มต้น) */
  customFooter?: string | null;
  /** เปิด/ปิด แสดงเลขประจำตัวผู้เสียภาษี */
  showTaxId?: boolean;
  /** เปิด/ปิด แสดงชื่อพนักงานแคชเชียร์ */
  showCashier?: boolean;
  /** เปิด/ปิด แสดงที่อยู่และเบอร์โทรร้าน */
  showAddress?: boolean;
}

/** เส้นคั่นแบบใบเสร็จความร้อน */
function Divider({ className = '' }: { className?: string }) {
  return <div className={`border-t border-dashed border-[#8A837A] ${className}`} />;
}

function MetaRow({
  label,
  value,
  isSmall = false,
}: {
  label: string;
  value: string;
  isSmall?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-1.5 leading-[1.6] ${
        isSmall ? 'text-[8px]' : 'text-[9px]'
      }`}
    >
      <span className="min-w-0 flex-1 break-words text-[#5A544D]">{label}</span>
      <span className="shrink-0 text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
  isSmall = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  isSmall?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? `flex items-baseline justify-between gap-1.5 pt-[1mm] font-bold ${
              isSmall ? 'text-[10.5px]' : 'text-[12px]'
            }`
          : `flex items-baseline justify-between gap-1.5 leading-[1.6] ${
              isSmall ? 'text-[8px]' : 'text-[9px]'
            }`
      }
    >
      <span className={`min-w-0 flex-1 break-words ${strong ? '' : 'text-[#3F3A34]'}`}>{label}</span>
      <span className="shrink-0 text-right tabular-nums">{value}</span>
    </div>
  );
}

/**
 * กระดาษใบเสร็จ (Thermal Paper)
 * รองรับทั้งขนาด 80mm (กว้าง 72mm) และ 58mm (กว้าง 48mm)
 * ใช้คอมโพเนนต์เดียวกันทั้งหน้าจอพรีวิวและแผ่นที่ส่งเข้าเครื่องพิมพ์
 */
export default function ReceiptPaper({
  receipt,
  isCopy = false,
  printCount,
  className = '',
  paperSize = '80mm',
  customFooter,
  showTaxId,
  showCashier,
  showAddress,
}: ReceiptPaperProps) {
  const is58 = paperSize === '58mm';

  const tableNumbers = Array.from(
    new Set(receipt.tables.map((t) => t.tableNumber).filter(Boolean)),
  );
  const orderNumbers = receipt.tables.map((t) => t.orderNumber).filter(Boolean);
  const showServiceCharge = receipt.serviceChargeRate > 0 || receipt.serviceChargeAmount > 0;
  const showVat = receipt.vatMode !== 'none' && receipt.vatAmount > 0;
  const showRounding = Math.abs(receipt.roundingAdjustment) >= 0.005;

  // จัดการเงื่อนไขการแสดงผลข้อมูลร้าน
  const canShowAddress = showAddress !== undefined ? showAddress : receipt.showAddress !== false;
  const canShowTaxId = showTaxId !== undefined ? showTaxId : receipt.showTaxId !== false;
  const canShowCashier = showCashier !== undefined ? showCashier : receipt.showCashier !== false;

  // จัดการข้อความท้ายใบเสร็จ:
  // ถ้า customFooter ถูกส่งมา (แม้เป็น '') ให้ใช้ตามนั้น
  // ถ้าไม่ ให้ดู receipt.footer
  // ถ้าทั้งคู่เป็น null/undefined จึง fallback เป็นค่าเริ่มต้น
  const rawFooter =
    customFooter !== undefined
      ? customFooter
      : receipt.footer !== undefined
      ? receipt.footer
      : 'ขอบคุณที่ใช้บริการ\nโปรดตรวจสอบรายการก่อนออกจากร้าน';

  const normalizedFooter = rawFooter ? rawFooter.replace(/\\n/g, '\n') : '';
  const footerLines = normalizedFooter
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <article
      className={`receipt-paper bg-white font-kanit text-[#1A1A1A] transition-all duration-200 ${
        is58
          ? 'w-[48mm] min-w-[48mm] max-w-[48mm] px-[2mm] py-[3mm] text-[8px]'
          : 'w-[72mm] min-w-[72mm] max-w-[72mm] px-[3mm] py-[4mm] text-[9px]'
      } ${className}`}
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
          <h1
            className={`leading-tight font-bold break-words ${
              is58 ? 'text-[12px]' : 'text-[14px]'
            }`}
          >
            {receipt.store.name}
          </h1>
        ) : null}

        {canShowAddress && receipt.store.address ? (
          <p
            className={`mt-[1mm] leading-[1.5] break-words text-[#3F3A34] ${
              is58 ? 'text-[7.5px]' : 'text-[8.5px]'
            }`}
          >
            {receipt.store.address}
          </p>
        ) : null}

        {canShowAddress && receipt.store.phone ? (
          <p
            className={`mt-[0.5mm] leading-[1.5] text-[#3F3A34] ${
              is58 ? 'text-[7.5px]' : 'text-[8.5px]'
            }`}
          >
            โทร. {receipt.store.phone}
          </p>
        ) : null}

        {canShowTaxId && receipt.store.taxId ? (
          <p
            className={`mt-[0.5mm] leading-[1.5] text-[#3F3A34] ${
              is58 ? 'text-[7.5px]' : 'text-[8.5px]'
            }`}
          >
            เลขประจำตัวผู้เสียภาษี {receipt.store.taxId}
          </p>
        ) : null}
      </header>

      <Divider className={is58 ? 'my-[1.8mm]' : 'my-[2.5mm]'} />

      <p
        className={`text-center font-bold tracking-wide ${
          is58 ? 'text-[9.5px]' : 'text-[10.5px]'
        }`}
      >
        {receiptDocTitle(receipt.vatMode)}
      </p>

      {/* ข้อมูลเอกสาร */}
      <div className={`mt-[1.8mm] ${is58 ? 'space-y-[0.3mm]' : 'space-y-[0.4mm]'}`}>
        <MetaRow label="เลขที่" value={receipt.receiptNumber} isSmall={is58} />
        <MetaRow label="วันที่" value={formatThaiDateTime(receipt.paidAt)} isSmall={is58} />
        {tableNumbers.length > 0 ? (
          <MetaRow label="โต๊ะ" value={tableNumbers.join(', ')} isSmall={is58} />
        ) : null}
        {orderNumbers.length > 0 ? (
          <MetaRow label="บิล" value={orderNumbers.join(', ')} isSmall={is58} />
        ) : null}
        {canShowCashier && receipt.cashier ? (
          <MetaRow label="พนักงาน" value={receipt.cashier} isSmall={is58} />
        ) : null}
      </div>

      <Divider className={is58 ? 'my-[1.8mm]' : 'my-[2.5mm]'} />

      {/* รายการอาหาร — ยอดทุกบรรทัดมาจาก server */}
      <div className={is58 ? 'space-y-[1.2mm]' : 'space-y-[1.6mm]'}>
        {receipt.lines.length === 0 ? (
          <p className="py-[2mm] text-center text-[#5A544D]">ไม่มีรายการอาหาร</p>
        ) : (
          receipt.lines.map((line, index) => {
            const modifiers = splitModifiers(line.modifiers);
            return (
              <div key={`${line.name}-${index}`} className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <p
                    className={`min-w-0 break-words leading-snug font-medium ${
                      is58 ? 'text-[8.5px]' : 'text-[9.5px]'
                    }`}
                  >
                    {line.name}
                    {line.isComped ? (
                      <span className="ml-[1mm] rounded-[1mm] border border-[#8A837A] px-[0.8mm] text-[6.5px] font-normal">
                        ฟรี
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={`leading-[1.4] text-[#5A544D] tabular-nums ${
                      is58 ? 'text-[7.5px]' : 'text-[8.5px]'
                    }`}
                  >
                    {line.qty} × {formatMoney(line.unitPrice)}
                  </p>
                  {modifiers.map((modifier) => (
                    <p
                      key={modifier}
                      className={`break-words leading-[1.4] text-[#5A544D] ${
                        is58 ? 'text-[7px]' : 'text-[8px]'
                      }`}
                    >
                      + {modifier}
                    </p>
                  ))}
                </div>
                <span
                  className={`shrink-0 text-right tabular-nums ${
                    is58 ? 'text-[8.5px]' : 'text-[9.5px]'
                  }`}
                >
                  {line.isComped ? '0.00' : formatMoney(line.lineTotal)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <Divider className={is58 ? 'my-[1.8mm]' : 'my-[2.5mm]'} />

      {/* สรุปยอด: ใช้ค่าจาก payments ตรง ๆ ไม่คำนวณซ้ำ */}
      <div className={is58 ? 'space-y-[0.4mm]' : 'space-y-[0.6mm]'}>
        <TotalRow label="ยอดรวม" value={formatMoney(receipt.subtotal)} isSmall={is58} />
        {showServiceCharge ? (
          <TotalRow
            label={
              receipt.serviceChargeRate > 0
                ? `ค่าบริการ ${receipt.serviceChargeRate}%`
                : 'ค่าบริการ'
            }
            value={formatMoney(receipt.serviceChargeAmount)}
            isSmall={is58}
          />
        ) : null}
        {showVat ? (
          <TotalRow
            label={vatLabel(receipt.vatMode, receipt.vatRate)}
            value={formatMoney(receipt.vatAmount)}
            isSmall={is58}
          />
        ) : null}
        {showRounding ? (
          <TotalRow
            label="ปัดเศษ"
            value={`${receipt.roundingAdjustment > 0 ? '+' : '-'}${formatMoney(
              Math.abs(receipt.roundingAdjustment),
            )}`}
            isSmall={is58}
          />
        ) : null}
      </div>

      <Divider className={is58 ? 'my-[1.6mm]' : 'my-[2mm]'} />

      <TotalRow
        label="รวมทั้งสิ้น"
        value={formatMoney(receipt.totalAmount)}
        strong
        isSmall={is58}
      />

      <Divider className={is58 ? 'my-[1.8mm]' : 'my-[2.5mm]'} />

      {/* การชำระเงิน */}
      <div className={is58 ? 'space-y-[0.3mm]' : 'space-y-[0.4mm]'}>
        <MetaRow
          label="ชำระโดย"
          value={paymentMethodLabel(receipt.paymentMethod)}
          isSmall={is58}
        />
        {receipt.cashReceived !== null ? (
          <MetaRow
            label="รับเงิน"
            value={formatMoney(receipt.cashReceived)}
            isSmall={is58}
          />
        ) : null}
        {receipt.changeAmount !== null ? (
          <MetaRow
            label="เงินทอน"
            value={formatMoney(receipt.changeAmount)}
            isSmall={is58}
          />
        ) : null}
      </div>

      {/* ข้อความท้ายใบเสร็จ (ถ้ามี) */}
      {footerLines.length > 0 && (
        <>
          <Divider className={is58 ? 'my-[1.8mm]' : 'my-[2.5mm]'} />
          <footer
            className={`text-center leading-[1.6] text-[#3F3A34] ${
              is58 ? 'text-[7.5px]' : 'text-[8.5px]'
            }`}
          >
            {footerLines.map((line, idx) => (
              <p key={idx} className={idx === 0 ? 'font-semibold' : ''}>
                {line}
              </p>
            ))}
            {isCopy ? <p className="mt-[1mm]">เอกสารฉบับนี้เป็นสำเนา</p> : null}
          </footer>
        </>
      )}

      {/* กรณีไม่มีข้อความท้าย แต่เป็นสำเนา */}
      {footerLines.length === 0 && isCopy && (
        <>
          <Divider className={is58 ? 'my-[1.8mm]' : 'my-[2.5mm]'} />
          <footer className="text-center text-[7.5px] leading-[1.6] text-[#3F3A34]">
            <p className="mt-[1mm]">เอกสารฉบับนี้เป็นสำเนา</p>
          </footer>
        </>
      )}
    </article>
  );
}
