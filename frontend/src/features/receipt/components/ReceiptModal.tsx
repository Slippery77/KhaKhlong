import { useEffect, useId, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { AlertCircle, Loader2, Printer, X } from 'lucide-react';
import { ApiError } from '../../../libs/appClient';
import ReceiptPaper from './ReceiptPaper';
import { useReceipt } from '../hooks/useReceipt';
import type { PaperSize, ReceiptPrintResult } from '../types/receipt.types';
import { getDevicePrinterSettings } from '../../printer/storage/printerStorage';
import './receipt.print.css';

interface ReceiptModalProps {
  /** paymentId (ไม่ใช่ paymentAttemptId) */
  paymentId: string;
  /** ปิดหน้าต่าง — ผู้เรียกเป็นคนตัดสินใจว่าจะทำอะไรต่อ */
  onClose: () => void;
  /** กำหนดขนาดกระดาษเจาะจง (ถ้าไม่ระบุ จะอ่านจาก printer settings ประจำเครื่อง) */
  paperSize?: PaperSize;
  /** สั่งพิมพ์ทันทีที่โหลดข้อมูลเสร็จ (ใช้สำหรับ auto-print) */
  autoPrintImmediate?: boolean;
}

/** โครงร่างกระดาษระหว่างรอข้อมูล */
function ReceiptSkeleton({ is58 = false }: { is58?: boolean }) {
  return (
    <div
      className={`mx-auto animate-pulse bg-white px-4 py-5 shadow-[0_14px_34px_-16px_rgba(45,36,30,0.45)] ring-1 ring-black/5 motion-reduce:animate-none ${
        is58 ? 'w-[48mm]' : 'w-[72mm]'
      }`}
      aria-hidden="true"
    >
      <div className="mx-auto h-3 w-28 rounded bg-stone-200" />
      <div className="mx-auto mt-2 h-2 w-36 rounded bg-stone-100" />
      <div className="mx-auto mt-1 h-2 w-28 rounded bg-stone-100" />
      <div className="my-4 border-t border-dashed border-stone-300" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="mt-2 flex items-center justify-between gap-3">
          <div className="h-2 w-20 rounded bg-stone-200" />
          <div className="h-2 w-10 rounded bg-stone-100" />
        </div>
      ))}
      <div className="my-4 border-t border-dashed border-stone-300" />
      <div className="ml-auto h-3 w-20 rounded bg-stone-200" />
    </div>
  );
}

/**
 * หน้าต่างพรีวิว + สั่งพิมพ์ใบเสร็จ
 * ลำดับการทำงาน: อ่านใบเสร็จ (GET) → กดพิมพ์ → บันทึกการพิมพ์ (POST /print) → เปิดหน้าต่างพิมพ์ของเบราว์เซอร์
 * ต้องบันทึกก่อนพิมพ์เสมอ เพื่อให้รู้ว่าเป็นฉบับแรกหรือ "สำเนา" และเคารพจำนวนพิมพ์ซ้ำของร้าน
 */
export default function ReceiptModal({
  paymentId,
  onClose,
  paperSize: propPaperSize,
  autoPrintImmediate = false,
}: ReceiptModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const autoPrintedRef = useRef(false);
  const { receipt, loading, error, reload, recordPrint } = useReceipt(paymentId);

  // ขนาดกระดาษจาก prop หรือจาก LocalStorage ประจำเครื่อง
  const [deviceSettings] = useState(() => getDevicePrinterSettings());
  const effectivePaperSize = propPaperSize ?? deviceSettings.paperSize;

  const [printInfo, setPrintInfo] = useState<ReceiptPrintResult | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  // ร้านตั้ง max_reprints ไว้ → พิมพ์ครบแล้วไม่ต้องยิงซ้ำ
  const [limitReached, setLimitReached] = useState(false);

  const isCopy = printInfo?.isCopy ?? false;

  // ปิดด้วย Escape + ล็อกการเลื่อนพื้นหลัง โดยคืนค่าเดิมให้หน้าจอที่เปิดซ้อนอยู่
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handlePrint = async () => {
    if (!receipt || printing || limitReached) return;

    setPrinting(true);
    setPrintError(null);
    try {
      const info = await recordPrint();
      // ต้อง commit ป้าย "สำเนา" ให้เสร็จก่อนเบราว์เซอร์ snapshot หน้าพิมพ์
      flushSync(() => setPrintInfo(info));
      window.print();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) setLimitReached(true);
        setPrintError(e.message);
      } else {
        setPrintError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      }
    } finally {
      setPrinting(false);
    }
  };

  // กรณีเปิดใช้งาน autoPrintImmediate เมื่อโหลดใบเสร็จเสร็จแล้วให้พิมพ์ทันที 1 ครั้ง
  useEffect(() => {
    if (autoPrintImmediate && receipt && !autoPrintedRef.current && !loading && !error) {
      autoPrintedRef.current = true;
      void handlePrint();
    }
  }, [autoPrintImmediate, receipt, loading, error]);

  const is58 = effectivePaperSize === '58mm';

  const printArea =
    receipt &&
    createPortal(
      <div className={`receipt-print-area hidden ${is58 ? 'paper-58mm' : ''}`}>
        <ReceiptPaper
          receipt={receipt}
          isCopy={isCopy}
          printCount={printInfo?.printCount}
          paperSize={effectivePaperSize}
        />
      </div>,
      document.body,
    );

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[70] font-kanit"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className="absolute inset-0 bg-[#2D241E]/45 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="relative flex h-full items-end justify-center sm:items-center sm:p-4">
            <div
              ref={panelRef}
              tabIndex={-1}
              className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#E8DFD5] bg-[#F6F1EA] shadow-2xl outline-none sm:max-h-[calc(100dvh-2rem)] sm:max-w-md sm:rounded-3xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#E8DFD5] bg-[#FAF7F2] px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={titleId} className="text-base font-semibold text-[#2D241E]">
                      ใบเสร็จรับเงิน
                    </h2>
                    <span className="rounded-full border border-[#E8DFD5] bg-white px-2 py-0.5 text-[10px] font-medium text-[#8C6D58]">
                      กระดาษ {is58 ? '58 มม.' : '80 มม.'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[#6B625B] tabular-nums">
                    เลขที่ {receipt?.receiptNumber ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="ปิดหน้าต่างใบเสร็จ"
                  className="rounded-lg p-1.5 text-stone-400 transition-colors duration-200 hover:bg-stone-200/60 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-[#A68874]/50 focus-visible:outline-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* กระดาษตัวอย่าง */}
              <div className="flex-1 overflow-y-auto bg-[#F6F1EA] px-4 py-5">
                {loading ? (
                  <ReceiptSkeleton is58={is58} />
                ) : error ? (
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2 py-10 text-center">
                    <AlertCircle className="h-8 w-8 text-rose-400" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[#2D241E]">เปิดใบเสร็จไม่ได้</p>
                    <p className="text-xs leading-relaxed text-[#6B625B]">{error}</p>
                    <button
                      type="button"
                      onClick={reload}
                      className="mt-1 rounded-xl border border-[#d9c6b0] px-3 py-1.5 text-xs font-semibold text-[#8C6D58] transition-colors duration-200 hover:bg-[#F3EDE4] focus-visible:ring-2 focus-visible:ring-[#A68874]/50 focus-visible:outline-none cursor-pointer"
                    >
                      ลองใหม่
                    </button>
                  </div>
                ) : receipt ? (
                  <div className="mx-auto w-fit bg-white shadow-[0_14px_34px_-16px_rgba(45,36,30,0.45)] ring-1 ring-black/5">
                    <ReceiptPaper
                      receipt={receipt}
                      isCopy={isCopy}
                      printCount={printInfo?.printCount}
                      paperSize={effectivePaperSize}
                    />
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="border-t border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3">
                <p
                  className="mb-2 text-center text-[11px] leading-relaxed"
                  aria-live="polite"
                >
                  {printError ? (
                    <span className="font-medium text-rose-600">{printError}</span>
                  ) : printInfo ? (
                    <span className="font-medium text-emerald-700">
                      พิมพ์แล้ว {printInfo.printCount} ครั้ง
                      {isCopy ? ' · ฉบับนี้เป็นสำเนา' : ''}
                    </span>
                  ) : (
                    <span className="text-[#6B625B]">
                      ตรวจรายการบนกระดาษก่อนกดพิมพ์ · พิมพ์ซ้ำได้ตามที่ร้านกำหนด
                    </span>
                  )}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-[#d9c6b0] bg-white py-2.5 text-sm font-medium text-[#2D241E] transition-colors duration-200 hover:bg-[#F3EDE4] focus-visible:ring-2 focus-visible:ring-[#A68874]/50 focus-visible:outline-none cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={!receipt || printing || limitReached}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#8C6D58] py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#7a5c45] focus-visible:ring-2 focus-visible:ring-[#A68874]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    {printing ? (
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Printer className="h-4 w-4" aria-hidden="true" />
                    )}
                    {printInfo ? 'พิมพ์อีกครั้ง' : 'พิมพ์ใบเสร็จ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {printArea}
    </>
  );
}
