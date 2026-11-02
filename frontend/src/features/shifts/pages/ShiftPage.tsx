import { useState } from 'react';
import { RefreshCw, Wallet, Package } from 'lucide-react';
import Header from '../../../components/Header';
import { useAuth } from '../../auth/context/AuthContext';
import BlockedOrdersNotice from '../components/BlockedOrdersNotice';
import CloseShiftCard from '../components/CloseShiftCard';
import MismatchPanel from '../components/MismatchPanel';
import OpenShiftCard from '../components/OpenShiftCard';
import ShiftClosedCard from '../components/ShiftClosedCard';
import StockAdjustmentCard from '../components/StockAdjustmentCard';
import { secondaryButtonClass } from '../constants';
import { useShift } from '../hooks/useShift';
import { SHIFT_STATUS_LABEL, formatBusinessDate } from '../utils/shiftFormat';
import { useOutbox } from '../../offline/hooks/useOutbox';
import { openOutboxPanel } from '../../offline/outboxPanel';

function ShiftSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-xs animate-pulse space-y-5" aria-busy="true">
      <div className="flex items-center justify-between border-b border-[#F0EAE2] pb-4">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-stone-200/70" />
          <div className="h-3.5 w-48 rounded bg-stone-200/40" />
        </div>
        <div className="h-7 w-20 rounded-full bg-stone-200/50" />
      </div>
      <div className="space-y-4">
        <div className="h-4 w-28 rounded bg-stone-200/60" />
        <div className="h-10 w-full rounded-xl bg-stone-200/40" />
        <div className="h-10 w-36 rounded-xl bg-stone-200/60" />
      </div>
    </div>
  );
}

export default function ShiftPage() {
  const { user } = useAuth();
  const {
    shift,
    isLoading,
    isSubmitting,
    error,
    pinError,
    blockedOrders,
    reload,
    openShift,
    closeShift,
    verifyWithPin,
  } = useShift();

  // [ใหม่] ออเดอร์ค้างส่งในเครื่องนี้ (ทุกผู้ใช้ของร้าน) — ใช้บล็อกปุ่มปิดกะ
  const { totalOrderCount } = useOutbox(user?.tenantSlug);
  const awaitingVerification =
    shift?.status === 'pending_verification' || shift?.status === 'escalated';
  const isClosed = shift?.status === 'closed_auto' || shift?.status === 'verified';
  const [activeTab, setActiveTab] = useState<'shift' | 'stock'>('shift');

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FAF7F2] font-kanit text-[#2D241E]">
      <Header />
      <main className="flex-1 w-full px-4 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Wallet className="mt-0.5 h-6 w-6 shrink-0 text-[#8C6D58]" aria-hidden="true" />
              <div>
                <h1 className="text-lg font-bold">ปิดกะ / นับเงิน</h1>
                <p className="mt-0.5 text-sm text-[#7A6A5C]">
                  นับเงินสดในลิ้นชักและวัตถุดิบคงเหลือ เทียบกับยอดในระบบ แล้วปิดกะประจำวัน
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reload}
              disabled={isLoading || isSubmitting}
              aria-label="โหลดข้อมูลกะใหม่"
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-xs text-[#5C4A3D] transition-colors duration-200 hover:border-[#8C6D58] hover:text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              รีเฟรช
            </button>
          </div>

          {shift && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#EFE8DC] px-2.5 py-1 font-medium text-[#6B5140]">
                {SHIFT_STATUS_LABEL[shift.status]}
              </span>
              <span className="text-[#7A6A5C]">{formatBusinessDate(shift.businessDate)}</span>
            </div>
          )}

          {error && blockedOrders.length === 0 && (
            <div
              role="alert"
              className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]"
            >
              <span className="leading-relaxed">{error}</span>
              <button
                type="button"
                onClick={reload}
                className={`${secondaryButtonClass} shrink-0 px-3 py-1.5 text-xs`}
              >
                ลองใหม่
              </button>
            </div>
          )}

          {isLoading && !shift ? (
            <ShiftSkeleton />
          ) : (
            <div className="space-y-4">
              <BlockedOrdersNotice orders={blockedOrders} />

              {!shift && <OpenShiftCard isSubmitting={isSubmitting} onSubmit={openShift} />}

              {shift && (
                <>
                  {/* ── Segmented Tab Control: ปิดกะ & นับเงินสด vs ปรับวัตถุดิบคงเหลือ ── */}
                  <div className="flex bg-stone-200/60 p-1 rounded-2xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('shift')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        activeTab === 'shift'
                          ? 'bg-white text-[#8C6D58] shadow-xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Wallet className="w-4 h-4 stroke-[2]" />
                      <span>{isClosed ? 'ข้อมูลกะวันนี้' : awaitingVerification ? 'ตรวจสอบส่วนต่าง' : 'ปิดกะ / นับเงิน'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('stock')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        activeTab === 'stock'
                          ? 'bg-white text-[#8C6D58] shadow-xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Package className="w-4 h-4 stroke-[2]" />
                      <span>ปรับวัตถุดิบคงเหลือ</span>
                    </button>
                  </div>

                  {/* ── แท็บ 1: ปิดกะ / นับเงินสด ── */}
                  {activeTab === 'shift' && (
                    <div className="space-y-4">
                      {shift.status === 'open' && (
                        <>
                          {/* Smart Bridge แจ้งเตือนปรับสต็อกก่อนปิดกะ */}
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F0D9A8] bg-[#FFF7E6] px-3.5 py-2.5 text-xs text-[#8A5A00]">
                            <span>นับวัตถุดิบคงเหลือก่อนปิดกะ เพื่อให้สต็อกตัดยอดถูกต้อง</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('stock')}
                              className="font-medium underline shrink-0 cursor-pointer hover:text-[#C27803]"
                            >
                              ไปปรับสต็อก &rarr;
                            </button>
                          </div>

                          <CloseShiftCard
                            shift={shift}
                            isSubmitting={isSubmitting}
                            onSubmit={closeShift}
                            unsentBills={totalOrderCount}
                            onShowUnsent={openOutboxPanel}
                          />
                        </>
                      )}

                      {awaitingVerification && (
                        <MismatchPanel
                          shift={shift}
                          role={user?.role}
                          isSubmitting={isSubmitting}
                          pinError={pinError}
                          onVerify={verifyWithPin}
                        />
                      )}

                      {isClosed && <ShiftClosedCard shift={shift} />}
                    </div>
                  )}

                  {/* ── แท็บ 2: ปรับวัตถุดิบคงเหลือ ── */}
                  {activeTab === 'stock' && (
                    <StockAdjustmentCard onNavigateToCloseShift={() => setActiveTab('shift')} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
