import { useRegisterSW } from 'virtual:pwa-register/react';
import { CloudCheck, RefreshCw, X } from 'lucide-react';

// เช็คเวอร์ชันใหม่จาก server ทุก 1 ชั่วโมง (แอป POS เปิดค้างทั้งวัน ไม่ได้ reload เอง)
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * ลงทะเบียน service worker + แจ้งเตือน 2 แบบ
 * - offlineReady: แคชไฟล์ครบครั้งแรก เปิดแอปได้แม้ไม่มีเน็ต
 * - needRefresh: มีเวอร์ชันใหม่ ให้พนักงานกดอัปเดตเองตอนว่าง (ไม่ reload กลางออเดอร์)
 *
 * TODO (ตอนทำ outbox): ซ่อนปุ่ม "อัปเดตเลย" ถ้ายังมีออเดอร์รอส่ง
 * เพราะเวอร์ชันใหม่อาจเปลี่ยนรูปแบบข้อมูลในคิว
 */
export default function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        // ออฟไลน์อยู่ก็ข้าม เดี๋ยวรอบหน้าค่อยเช็ค
        if (navigator.onLine) registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error('[PWA] ลงทะเบียน service worker ไม่สำเร็จ', error);
    },
  });

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[1000] flex max-w-sm items-start gap-3 rounded-2xl border border-[#E8DFD5] bg-white p-4 text-[#2D241E] shadow-lg"
    >
      {needRefresh ? (
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-[#8C6D58]" aria-hidden="true" />
      ) : (
        <CloudCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8C6D58]" aria-hidden="true" />
      )}

      <div className="flex-1">
        <p className="font-medium">
          {needRefresh ? 'มีเวอร์ชันใหม่' : 'พร้อมใช้งานออฟไลน์'}
        </p>
        <p className="mt-0.5 text-sm text-[#2D241E]/70">
          {needRefresh
            ? 'กดอัปเดตตอนที่ไม่มีออเดอร์ค้างในหน้าจอ หน้าเว็บจะโหลดใหม่'
            : 'เปิดแอปได้แม้อินเทอร์เน็ตหลุด'}
        </p>

        {needRefresh && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="cursor-pointer rounded-xl bg-[#8C6D58] px-3 py-1.5 text-sm text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
            >
              อัปเดตเลย
            </button>
            <button
              type="button"
              onClick={close}
              className="cursor-pointer rounded-xl border border-[#d9c6b0] px-3 py-1.5 text-sm transition-colors duration-200 hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
            >
              ภายหลัง
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={close}
        aria-label="ปิดการแจ้งเตือน"
        className="cursor-pointer rounded-lg p-1 text-[#2D241E]/60 transition-colors duration-200 hover:bg-[#FAF7F2] hover:text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
