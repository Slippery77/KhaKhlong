import { useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { getConnectionState, subscribeConnection } from '../connectionStatus';
import { flushOutbox, setFlushAuth } from '../flush';
import { hasPending } from '../outbox';

const PERIODIC_FLUSH_MS = 30_000;

/**
 * ตัวสั่ง flush เบื้องหลัง — ไม่แสดงอะไรบนจอ (return null)
 * เป็น component เพราะต้องอ่าน token/user จาก AuthContext (ซึ่งอยู่ใน React)
 *
 * ทริกเกอร์:
 *  1. login / token เปลี่ยน / เปิดแอป   ส่งของค้างจากรอบก่อน
 *  2. สถานะการเชื่อมต่อกลับมา online    เน็ตกลับ → ส่งทันที
 *  3. ทุก 30 วินาที ถ้ามีรายการรอส่ง     กันพลาดกรณีไม่มี event
 * (หลังหย่อนลงกล่อง ผู้หย่อนเรียก flushOutbox() เอง)
 */
export default function OutboxRunner() {
  const { accessToken, user } = useAuth();
  const userId = user?.sub;
  const tenantSlug = user?.tenantSlug;

  // 1. ส่งข้อมูล login ล่าสุดให้ flush.ts + flush ทันที
  useEffect(() => {
    if (!userId || !tenantSlug) {
      setFlushAuth(null);
      return;
    }
    setFlushAuth({ accessToken, userId, tenantSlug });
    void flushOutbox();
  }, [accessToken, userId, tenantSlug]);

  // 2 + 3. ฟังสถานะการเชื่อมต่อ และตั้งเวลา
  useEffect(() => {
    if (!tenantSlug) return;

    let previous = getConnectionState().status;
    const unsubscribe = subscribeConnection(() => {
      const now = getConnectionState().status;
      if (now === 'online' && previous !== 'online') void flushOutbox();
      previous = now;
    });

    const timer = setInterval(async () => {
      if (await hasPending(tenantSlug)) void flushOutbox();
    }, PERIODIC_FLUSH_MS);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [tenantSlug]);

  return null;
}