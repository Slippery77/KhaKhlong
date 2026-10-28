import { RefreshCw, WifiOff } from 'lucide-react';

interface StaleDataBannerProps {
  /** ชื่อข้อมูลที่แสดง เช่น "ข้อมูลโต๊ะ" */
  label: string;
  /** Date.now() ตอนที่บันทึก snapshot */
  savedAt: number;
  /** ปุ่มลองโหลดใหม่ (ไม่ส่งมา = ไม่แสดงปุ่ม) */
  onRetry?: () => void;
  isRetrying?: boolean;
}

const timeFormat = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatSavedAt(savedAt: number): string {
  const saved = new Date(savedAt);
  const isToday = saved.toDateString() === new Date().toDateString();
  // วันเดียวกันโชว์แค่เวลา ข้ามวันโชว์วันที่ด้วย — ข้อมูลข้ามวันคือสัญญาณว่าเก่ามาก
  return isToday ? timeFormat.format(saved) : dateTimeFormat.format(saved);
}

/**
 * แถบเตือนว่ากำลังแสดงข้อมูลเก่าจาก cache เพราะติดต่อ server ไม่ได้
 * ต้องแสดงทุกครั้งที่ใช้ snapshot — พนักงานต้องรู้ว่าสถานะที่เห็นอาจไม่ตรงความจริง
 */
export default function StaleDataBanner({ label, savedAt, onRetry, isRetrying = false }: StaleDataBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-xl border border-[#d9c6b0] bg-[#F3EDE4] px-4 py-2.5 text-sm text-[#2D241E]"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-[#8C6D58]" aria-hidden="true" />
      <p className="flex-1">
        <span className="font-medium">ติดต่อเซิร์ฟเวอร์ไม่ได้</span>
        <span className="text-[#2D241E]/70">
          {' '}
          · แสดง{label} ณ {formatSavedAt(savedAt)} น. สถานะอาจไม่ตรงกับปัจจุบัน
        </span>
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[#8C6D58] transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
          ลองใหม่
        </button>
      )}
    </div>
  );
}
