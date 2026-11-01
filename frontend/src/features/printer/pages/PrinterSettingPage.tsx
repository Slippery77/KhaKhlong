import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sliders,
  Store,
  Sparkles,
} from 'lucide-react';
import SettingNavBar from '../../../components/settingNavBar';
import { useAuth } from '../../auth/context/AuthContext';
import { usePrinterSettings } from '../hooks/usePrinterSettings';
import { createMockReceipt } from '../utils/mockReceipt';
import ReceiptPaper from '../../receipt/components/ReceiptPaper';
import type { PaperSize } from '../../receipt/types/receipt.types';
import '../../receipt/components/receipt.print.css';

const DEFAULT_FOOTER_NOTE = 'ขอบคุณที่ใช้บริการ\nโปรดตรวจสอบรายการก่อนออกจากร้าน';

export default function PrinterSettingPage() {
  const { user } = useAuth();
  const {
    settings,
    saveSettings,
    isLoading,
    isSaving,
    saveSuccess,
    error,
  } = usePrinterSettings();

  // Local form state for instant preview & editing before save
  const [form, setForm] = useState(settings);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const isInitialSyncDone = useRef(false);

  // Sync initial settings into form only when initial API load finishes
  useEffect(() => {
    if (!isLoading && !isInitialSyncDone.current) {
      setForm(settings);
      isInitialSyncDone.current = true;
    }
  }, [isLoading, settings]);

  // Accessibility IDs
  const paperSizeGroupId = useId();
  const autoPrintSwitchId = useId();
  const maxReprintsInputId = useId();
  const footerTextareaId = useId();
  const showTaxIdSwitchId = useId();
  const showCashierSwitchId = useId();
  const showAddressSwitchId = useId();

  // Store name from user session
  const storeName = user?.restaurant_name ?? 'ค้าคล่อง คาเฟ่ & บิสโทร';
  const mockReceipt = useMemo(() => createMockReceipt(storeName), [storeName]);

  const handlePaperSizeChange = (size: PaperSize) => {
    setForm((prev) => ({ ...prev, paperSize: size }));
  };

  const handleResetFooter = () => {
    setForm((prev) => ({ ...prev, receiptFooter: DEFAULT_FOOTER_NOTE }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(form);
  };

  const handleTestPrint = () => {
    document.body.classList.add('is-printing-receipt');
    try {
      // ใช้ flushSync การันตีว่า React Portal commit ลง DOM เสร็จสมบูรณ์ทันทีก่อนเรียก window.print()
      flushSync(() => {
        setIsTestPrinting(true);
      });
      window.print();
    } finally {
      setIsTestPrinting(false);
      document.body.classList.remove('is-printing-receipt');
    }
  };

  // Portal container for print execution
  const testPrintArea =
    isTestPrinting &&
    createPortal(
      <div
        className={`receipt-print-area hidden ${
          form.paperSize === '58mm' ? 'paper-58mm' : ''
        }`}
      >
        <ReceiptPaper
          receipt={mockReceipt}
          paperSize={form.paperSize}
          customFooter={form.receiptFooter}
          showTaxId={form.showTaxId}
          showCashier={form.showCashier}
          showAddress={form.showAddress}
        />
      </div>,
      document.body,
    );

  const footerLength = form.receiptFooter?.length ?? 0;
  const isFooterOverLimit = footerLength > 500;

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-kanit text-[#2D241E]">
      <SettingNavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8C6D58]/10 text-[#8C6D58]">
                <Printer className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[#2D241E]">
                ตั้งค่าเครื่องพิมพ์ & ใบเสร็จ
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-stone-600">
              กำหนดขนาดกระดาษความร้อน พฤติกรรมการพิมพ์อัตโนมัติ และปรับแต่งข้อความท้ายใบเสร็จของร้าน
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={isTestPrinting || isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d9c6b0] bg-white px-4 py-2.5 text-sm font-semibold text-[#8C6D58] shadow-xs transition-colors duration-200 hover:bg-[#F3EDE4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isTestPrinting ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              พิมพ์ทดสอบ
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-xs"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">บันทึกการตั้งค่าไม่สำเร็จ</p>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-800 shadow-xs transition-all duration-300"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="font-semibold">บันทึกการตั้งค่าเครื่องพิมพ์เรียบร้อยแล้ว</p>
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Form Column */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7">
            {/* Section 1: ฮาร์ดแวร์ประจำเครื่อง */}
            <section
              aria-labelledby="section-hardware"
              className="rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-xs"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
                <Sliders className="h-4 w-4 text-[#8C6D58]" />
                <h2 id="section-hardware" className="text-base font-semibold text-[#2D241E]">
                  ฮาร์ดแวร์ประจำเครื่องนี้ (Device Settings)
                </h2>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                การตั้งค่าในส่วนนี้จะถูกบันทึกไว้ในเครื่อง POS ปัจจุบันโดยเฉพาะ
              </p>

              {/* เลือกขนาดกระดาษ */}
              <div className="mt-5 space-y-3">
                <label
                  id={paperSizeGroupId}
                  className="block text-xs font-semibold text-stone-700"
                >
                  ขนาดกระดาษความร้อน (Paper Width)
                </label>
                <div
                  role="radiogroup"
                  aria-labelledby={paperSizeGroupId}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  {/* Option 80mm */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.paperSize === '80mm'}
                    onClick={() => handlePaperSizeChange('80mm')}
                    className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                      form.paperSize === '80mm'
                        ? 'border-[#8C6D58] bg-[#FAF7F2] ring-2 ring-[#8C6D58]/20 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-[#d9c6b0] hover:bg-stone-50/70'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-semibold text-sm text-[#2D241E]">80 มม.</span>
                      <span className="rounded-full bg-[#8C6D58]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8C6D58]">
                        มาตรฐานร้านอาหาร
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
                      พื้นที่พิมพ์กว้าง 72 มม. เหมาะสำหรับเครื่องพิมพ์เคาน์เตอร์แคชเชียร์
                    </p>
                  </button>

                  {/* Option 58mm */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.paperSize === '58mm'}
                    onClick={() => handlePaperSizeChange('58mm')}
                    className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                      form.paperSize === '58mm'
                        ? 'border-[#8C6D58] bg-[#FAF7F2] ring-2 ring-[#8C6D58]/20 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-[#d9c6b0] hover:bg-stone-50/70'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-semibold text-sm text-[#2D241E]">58 มม.</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                        พกพา / กะทัดรัด
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
                      พื้นที่พิมพ์กว้าง 48 มม. ย่อตัวหนังสืออัตโนมัติ เหมาะกับเครื่องบลูทูธพกพา
                    </p>
                  </button>
                </div>
              </div>

              {/* พิมพ์อัตโนมัติ Auto-Print */}
              <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4">
                <div className="min-w-0">
                  <label
                    htmlFor={autoPrintSwitchId}
                    className="block text-sm font-semibold text-[#2D241E] cursor-pointer"
                  >
                    พิมพ์ใบเสร็จอัตโนมัติ (Auto-Print)
                  </label>
                  <p className="mt-0.5 text-xs text-stone-500 leading-relaxed">
                    เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ทันทีเมื่อแคชเชียร์ชำระเงินสำเร็จ
                  </p>
                </div>
                <input
                  id={autoPrintSwitchId}
                  type="checkbox"
                  checked={form.autoPrint}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, autoPrint: e.target.checked }))
                  }
                  className="mt-1 h-5 w-5 rounded-md border-stone-300 text-[#8C6D58] focus:ring-[#8C6D58] cursor-pointer"
                />
              </div>
            </section>

            {/* Section 2: นโยบายและข้อความใบเสร็จของร้าน */}
            <section
              aria-labelledby="section-policy"
              className="rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-xs"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
                <Store className="h-4 w-4 text-[#8C6D58]" />
                <h2 id="section-policy" className="text-base font-semibold text-[#2D241E]">
                  นโยบายและข้อความใบเสร็จ (Store Policies)
                </h2>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                การตั้งค่าในส่วนนี้จะถูกบันทึกไปยังเซิร์ฟเวอร์ และมีผลกับใบเสร็จทุกเครื่องในร้าน
              </p>

              {/* จำนวนครั้งพิมพ์ซ้ำ */}
              <div className="mt-5 space-y-2">
                <label
                  htmlFor={maxReprintsInputId}
                  className="block text-xs font-semibold text-stone-700"
                >
                  จำกัดการพิมพ์ซ้ำสูงสุด (ครั้ง)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id={maxReprintsInputId}
                    type="number"
                    min="0"
                    max="1000"
                    value={form.maxReprints}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maxReprints: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="w-32 rounded-xl border border-stone-200 px-3.5 py-2 text-sm font-semibold text-[#2D241E] focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20"
                  />
                  <span className="text-xs text-stone-500">
                    {form.maxReprints === 0
                      ? '0 = อนุญาตให้พิมพ์ซ้ำได้ไม่จำกัดจำนวนครั้ง'
                      : `พิมพ์ได้ไม่เกิน ${form.maxReprints} ครั้งต่อบิล (ป้องกันทุจริต)`}
                  </span>
                </div>
              </div>

              {/* ข้อความท้ายใบเสร็จ */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={footerTextareaId}
                    className="block text-xs font-semibold text-stone-700"
                  >
                    ข้อความท้ายใบเสร็จ (Receipt Footer Note)
                  </label>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] tabular-nums ${
                        isFooterOverLimit ? 'font-bold text-rose-600' : 'text-stone-400'
                      }`}
                    >
                      {footerLength}/500
                    </span>
                    <button
                      type="button"
                      onClick={handleResetFooter}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8C6D58] hover:text-[#7a5c45] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      คืนค่าเริ่มต้น
                    </button>
                  </div>
                </div>
                <textarea
                  id={footerTextareaId}
                  rows={3}
                  maxLength={500}
                  value={form.receiptFooter}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, receiptFooter: e.target.value }))
                  }
                  placeholder="เช่น ขอบคุณที่ใช้บริการ / Wi-Fi: KhaKhlong_Free (เว้นว่างไว้หากไม่ต้องการให้แสดงข้อความ)"
                  className={`w-full rounded-xl border p-3 text-sm text-[#2D241E] placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
                    isFooterOverLimit
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-stone-200 focus:border-[#8C6D58] focus:ring-[#8C6D58]/20'
                  }`}
                />
                <p className="text-[11px] text-stone-500">
                  รองรับการขึ้นบรรทัดใหม่ ไม่เกิน 500 ตัวอักษร (ลบทั้งหมดเพื่อให้ท้ายใบเสร็จว่างได้)
                </p>
              </div>
            </section>

            {/* Section 3: องค์ประกอบบนใบเสร็จ */}
            <section
              aria-labelledby="section-elements"
              className="rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-xs"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
                <FileText className="h-4 w-4 text-[#8C6D58]" />
                <h2 id="section-elements" className="text-base font-semibold text-[#2D241E]">
                  ตัวเลือกการแสดงผลข้อมูลร้าน (Receipt Details)
                </h2>
              </div>

              <div className="mt-4 divide-y divide-stone-100">
                {/* Switch 1: ที่อยู่และเบอร์โทรร้าน */}
                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <label
                      htmlFor={showAddressSwitchId}
                      className="text-sm font-semibold text-[#2D241E] cursor-pointer"
                    >
                      แสดงที่อยู่และเบอร์โทรร้าน
                    </label>
                    <p className="text-xs text-stone-500">
                      แสดงข้อมูลที่อยู่ที่ระบุไว้ในหน้าตั้งค่าร้าน
                    </p>
                  </div>
                  <input
                    id={showAddressSwitchId}
                    type="checkbox"
                    checked={form.showAddress}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showAddress: e.target.checked }))
                    }
                    className="h-5 w-5 rounded-md border-stone-300 text-[#8C6D58] focus:ring-[#8C6D58] cursor-pointer"
                  />
                </div>

                {/* Switch 2: เลขประจำตัวผู้เสียภาษี */}
                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <label
                      htmlFor={showTaxIdSwitchId}
                      className="text-sm font-semibold text-[#2D241E] cursor-pointer"
                    >
                      แสดงเลขประจำตัวผู้เสียภาษี (Tax ID)
                    </label>
                    <p className="text-xs text-stone-500">
                      แสดงเลขประจำตัวผู้เสียภาษี 13 หลักเมื่อร้านจดทะเบียน VAT
                    </p>
                  </div>
                  <input
                    id={showTaxIdSwitchId}
                    type="checkbox"
                    checked={form.showTaxId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showTaxId: e.target.checked }))
                    }
                    className="h-5 w-5 rounded-md border-stone-300 text-[#8C6D58] focus:ring-[#8C6D58] cursor-pointer"
                  />
                </div>

                {/* Switch 3: ชื่อพนักงานแคชเชียร์ */}
                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <label
                      htmlFor={showCashierSwitchId}
                      className="text-sm font-semibold text-[#2D241E] cursor-pointer"
                    >
                      แสดงชื่อพนักงานแคชเชียร์
                    </label>
                    <p className="text-xs text-stone-500">
                      แสดงชื่อพนักงานผู้รับชำระเงินในกล่องข้อมูลเอกสาร
                    </p>
                  </div>
                  <input
                    id={showCashierSwitchId}
                    type="checkbox"
                    checked={form.showCashier}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showCashier: e.target.checked }))
                    }
                    className="h-5 w-5 rounded-md border-stone-300 text-[#8C6D58] focus:ring-[#8C6D58] cursor-pointer"
                  />
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving || isLoading || isFooterOverLimit}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8C6D58] py-3 text-sm font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-[#7a5c45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isSaving ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่าทั้งหมด'}
              </button>
            </div>
          </form>

          {/* Live Preview Column */}
          <aside className="lg:col-span-5">
            <div className="sticky top-6 rounded-2xl border border-[#E8DFD5] bg-[#F6F1EA] p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#8C6D58]" />
                  <h2 className="text-sm font-semibold text-[#2D241E]">
                    ตัวอย่างใบเสร็จจริง (Live Preview)
                  </h2>
                </div>
                <span className="rounded-full border border-[#d9c6b0] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#8C6D58]">
                  ขนาด {form.paperSize === '58mm' ? '58 มม.' : '80 มม.'}
                </span>
              </div>

              {/* Thermal Paper Simulation Container */}
              <div className="flex justify-center overflow-x-auto py-2">
                <div className="rounded-sm bg-white shadow-[0_10px_25px_-5px_rgba(45,36,30,0.18)] ring-1 ring-black/5">
                  <ReceiptPaper
                    receipt={mockReceipt}
                    paperSize={form.paperSize}
                    customFooter={form.receiptFooter}
                    showTaxId={form.showTaxId}
                    showCashier={form.showCashier}
                    showAddress={form.showAddress}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-[#E8DFD5] pt-3 text-center">
                <p className="text-[11px] text-stone-500">
                  ตัวอย่างใบเสร็จจะปรับเปลี่ยนแบบเรียลไทม์ตามการตั้งค่าฝั่งซ้ายมือ
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Hidden test print portal */}
      {testPrintArea}
    </div>
  );
}
