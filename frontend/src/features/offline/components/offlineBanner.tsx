import { useState } from 'react';
import { AlertTriangle, CloudOff, CloudUpload, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { pingServer } from '../connectionStatus';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useOutbox } from '../hooks/useOutbox';
import { openOutboxPanel } from '../outboxPanel';

/**
 * ป้ายลอยกลางจอด้านล่าง บอกสถานะการเชื่อมต่อ + ออเดอร์ค้างส่งของทั้งแอป
 * - ออนไลน์ + ไม่มีของค้าง: ไม่แสดงอะไร
 * - ออฟไลน์ / ติดต่อ server ไม่ได้: แสดงค้างไว้จนกว่าจะกลับมา
 * - เพิ่งกลับมา: แสดง "เชื่อมต่อแล้ว" 3 วินาทีแล้วหาย
 * - [ใหม่] มีออเดอร์รอส่ง / ส่งไม่สำเร็จ: แสดงจำนวนบิล + ปุ่ม "ดูรายการ" (เปิด OutboxPanel)
 *
 * วางกลางล่าง: มุมขวาล่างเป็นของ UpdatePrompt และมุมซ้ายล่างทับการ์ดสรุป "มีลูกค้า" ใน sidebar หน้าโต๊ะ
 */
export default function OfflineBanner() {
  const { status, justReconnected } = useConnectionStatus();
  const { user } = useAuth();
  // ยังไม่ login → tenantSlug เป็น undefined → useOutbox คืนค่าว่าง ป้ายส่วนออเดอร์ไม่แสดง
  const { pendingOrderCount, failedOrderCount } = useOutbox(user?.tenantSlug);
  const [isChecking, setIsChecking] = useState(false);

  // hooks ทุกตัวต้องเรียกก่อน return แรก (กฎของ React: ลำดับ hook ต้องเท่าเดิมทุก render)
  const hasQueue = pendingOrderCount > 0 || failedOrderCount > 0;
  if (status === 'online' && !justReconnected && !hasQueue) return null;

  const retry = async () => {
    setIsChecking(true);
    await pingServer();
    setIsChecking(false);
  };

  // เลือกไอคอน ข้อความ และสีตามสถานะ — ลำดับความสำคัญ: ส่งไม่สำเร็จ > ออฟไลน์ > ติดต่อไม่ได้ > กำลังส่ง > เชื่อมต่อแล้ว
  const view =
    failedOrderCount > 0
      ? {
          // ต้องให้คนจัดการ (ลบ/ลองใหม่) — แสดงเด่นสุดแม้จะออนไลน์อยู่
          Icon: AlertTriangle,
          title: `ส่งออเดอร์ไม่สำเร็จ ${failedOrderCount} บิล`,
          detail: 'ครัวยังไม่ได้รับรายการนี้ · กด "ดูรายการ" เพื่อจัดการ',
          tone: 'border-[#F4C7C3] bg-[#FEF3F2] text-[#B42318]',
          canRetry: status === 'unreachable',
        }
      : status === 'offline'
        ? {
            Icon: WifiOff,
            title: 'ออฟไลน์',
            detail: 'ไม่มีอินเทอร์เน็ต · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
            tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
            canRetry: false, // ไม่มีเน็ต กดลองก็ไม่มีประโยชน์ รอ event 'online'
          }
        : status === 'unreachable'
          ? {
              Icon: CloudOff,
              title: 'ติดต่อเซิร์ฟเวอร์ไม่ได้',
              detail: 'กำลังลองใหม่อัตโนมัติ · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
              tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
              canRetry: true,
            }
          : hasQueue
            ? {
                // ออนไลน์แล้วแต่ยังมีของรอส่ง (OutboxRunner กำลังส่ง หรือเป็นของผู้ใช้อื่นที่ยังไม่ login)
                Icon: CloudUpload,
                title: 'กำลังส่งออเดอร์ที่ค้าง',
                detail: 'ส่งให้อัตโนมัติ ไม่ต้องกดซ้ำ',
                tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
                canRetry: false,
              }
            : {
                Icon: Wifi,
                title: 'เชื่อมต่อแล้ว',
                detail: 'กดรีเฟรชในหน้านั้นเพื่อดูข้อมูลล่าสุด',
                tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
                canRetry: false,
              };

  const { Icon } = view;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-[1000] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 font-kanit shadow-md transition-colors duration-200 ${view.tone}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{view.title}</p>
        <p className="opacity-70">{view.detail}</p>
        {/* [ใหม่] บรรทัดจำนวนรอส่ง — แสดงเมื่อป้ายหลักเป็นเรื่องอื่น (ออฟไลน์/ติดต่อไม่ได้) แต่มีของรอส่งด้วย */}
        {pendingOrderCount > 0 && (failedOrderCount > 0 || status !== 'online') && (
          <p className="mt-0.5 font-medium">รอส่ง {pendingOrderCount} บิล</p>
        )}
      </div>
      {hasQueue && (
        <button
          type="button"
          onClick={openOutboxPanel}
          className="shrink-0 cursor-pointer rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
        >
          ดูรายการ
        </button>
      )}
      {view.canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={isChecking}
          aria-label="ลองเชื่อมต่อเซิร์ฟเวอร์อีกครั้ง"
          className="cursor-pointer rounded-lg p-1 text-[#8C6D58] transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}