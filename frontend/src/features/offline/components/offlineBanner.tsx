import { useState } from 'react';
import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { pingServer } from '../connectionStatus';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

export default function OfflineBanner() {
  const { status, justReconnected } = useConnectionStatus();
  const [isChecking, setIsChecking] = useState(false);
  // สถานะปุ่ม "ลองใหม่" — เป็น state ของป้ายนี้เท่านั้น ไม่ต้องอยู่ใน store

  if (status === 'online' && !justReconnected) return null;
  // ออนไลน์ปกติ → ไม่แสดงอะไรเลย (ไม่กินพื้นที่จอ)

  const retry = async () => {
    setIsChecking(true);        // ปุ่มหมุน + กดซ้ำไม่ได้
    await pingServer();          // ผลจะไปอัปเดต store เอง → ป้ายเปลี่ยนเอง
    setIsChecking(false);
  };

  const view =
    status === 'offline'
      ? {
          Icon: WifiOff,
          title: 'ออฟไลน์',
          detail: 'ไม่มีอินเทอร์เน็ต · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
          tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',   // สีครีมของแบรนด์
          canRetry: false,   // ไม่มีเน็ต กดไปก็ไม่ถึง — รอ event 'online' แทน
        }
      : status === 'unreachable'
        ? {
            Icon: CloudOff,
            title: 'ติดต่อเซิร์ฟเวอร์ไม่ได้',
            detail: 'กำลังลองใหม่อัตโนมัติ · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
            tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
            canRetry: true,  // เน็ตมี อาจลองก่อนรอบ 15 วิได้
          }
        : {
            // มาถึงตรงนี้ = status 'online' + justReconnected true
            Icon: Wifi,
            title: 'เชื่อมต่อแล้ว',
            detail: 'กดรีเฟรชในหน้านั้นเพื่อดูข้อมูลล่าสุด',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',   // สีเขียว = ข่าวดี
            canRetry: false,
          };
  // เขียนเป็น object เดียวแทน if-else ใน JSX หลายจุด → JSX ด้านล่างอ่านง่าย

  const { Icon } = view;
  // ต้องดึงออกมาเป็นตัวแปรชื่อขึ้นต้นตัวใหญ่ก่อน
  // JSX ถือว่า <icon /> ตัวเล็ก = แท็ก HTML · <Icon /> ตัวใหญ่ = component

  return (
    <div
      role="status"
      aria-live="polite"
      // screen reader อ่านข้อความเมื่อป้ายเปลี่ยน
      className={`fixed bottom-4 left-1/2 z-1000 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 font-kanit shadow-md transition-colors duration-200 ${view.tone}`}
      // fixed bottom-4               ลอยห่างขอบล่าง 16px ไม่ดันเนื้อหาหน้า
      // left-1/2 + -translate-x-1/2  จัดกึ่งกลางแนวนอน (ขอบซ้ายอยู่กลางจอ แล้วเลื่อนกลับครึ่งความกว้างตัวเอง)
      // w-max                        กว้างเท่าข้อความ
      // max-w-[calc(100vw-2rem)]     จอแคบไม่ล้นขอบ
      // z-[1000]                     อยู่เหนือ modal ทั่วไป
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{view.title}</p>
        <p className="opacity-70">{view.detail}</p>
      </div>
      {view.canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={isChecking}
          aria-label="ลองเชื่อมต่อเซิร์ฟเวอร์อีกครั้ง"
          // ปุ่มมีแต่ไอคอน ต้องมี aria-label (กฎ AGENTS.md)
          className="cursor-pointer rounded-lg p-1 text-[#8C6D58] transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}