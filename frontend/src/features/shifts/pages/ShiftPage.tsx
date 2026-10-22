import { Loader2, RefreshCw, Wallet } from 'lucide-react';
import Header from '../../../components/Header';
import { useAuth } from '../../auth/context/AuthContext';
import BlockedOrdersNotice from '../components/BlockedOrdersNotice';
import CloseShiftCard from '../components/CloseShiftCard';
import MismatchPanel from '../components/MismatchPanel';
import OpenShiftCard from '../components/OpenShiftCard';
import ShiftClosedCard from '../components/ShiftClosedCard';
import { secondaryButtonClass } from '../constants';
import { useShift } from '../hooks/useShift';
import { SHIFT_STATUS_LABEL, formatBusinessDate } from '../utils/shiftFormat';

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

  const awaitingVerification =
    shift?.status === 'pending_verification' || shift?.status === 'escalated';
  const isClosed = shift?.status === 'closed_auto' || shift?.status === 'verified';

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
                  นับเงินสดในลิ้นชัก เทียบกับยอดในระบบ แล้วปิดกะประจำวัน
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

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E8DFD5] bg-white py-16 text-sm text-[#7A6A5C]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูลกะ…
            </div>
          ) : (
            <div className="space-y-4">
              <BlockedOrdersNotice orders={blockedOrders} />

              {!shift && <OpenShiftCard isSubmitting={isSubmitting} onSubmit={openShift} />}

              {shift?.status === 'open' && (
                <CloseShiftCard shift={shift} isSubmitting={isSubmitting} onSubmit={closeShift} />
              )}

              {shift && awaitingVerification && (
                <MismatchPanel
                  shift={shift}
                  role={user?.role}
                  isSubmitting={isSubmitting}
                  pinError={pinError}
                  onVerify={verifyWithPin}
                />
              )}

              {shift && isClosed && <ShiftClosedCard shift={shift} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
