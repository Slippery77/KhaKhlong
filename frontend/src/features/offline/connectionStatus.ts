// ===================== (ก) ชนิดข้อมูล =====================

export type ConnectionStatus = 'online' | 'offline' | 'unreachable';
// union type — พิมพ์ 'onlin' ผิด TypeScript แดงทันที

export interface ConnectionState {
  status: ConnectionStatus;
  justReconnected: boolean;
  // true ช่วง 3 วินาทีหลังกลับมา — ให้ป้ายแสดง "เชื่อมต่อแล้ว" แล้วหายเอง
  // เก็บไว้ใน store (ไม่ใช่ใน component) เพราะ ESLint ของโปรเจกต์ห้าม setState ใน useEffect
}

const PING_INTERVAL_MS = 15_000;     // 15_000 = 15000 (ขีดล่างช่วยอ่านตัวเลข TypeScript ยอมรับ)
const PING_TIMEOUT_MS = 5_000;       // server ไม่ตอบใน 5 วิ = ถือว่าติดต่อไม่ได้
const RECONNECTED_SHOW_MS = 3_000;   // แสดง "เชื่อมต่อแล้ว" 3 วิ

// ===================== (ข) state + ผู้ติดตาม =====================

let state: ConnectionState = {
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  // ค่าเริ่มต้น: ถ้าเปิดแอปตอนไม่มีเน็ต เริ่มที่ 'offline' เลย
  // typeof navigator !== 'undefined' = กันพังถ้ารันนอก browser (เช่นเทสต์บน Node)
  justReconnected: false,
};

const listeners = new Set<() => void>();
// รายชื่อ "ผู้ติดตาม" — ทุกครั้งที่ state เปลี่ยน เรียกทุกฟังก์ชันในนี้
// React (ผ่าน useSyncExternalStore) จะใส่ฟังก์ชันของตัวเองเข้ามา
// ใช้ Set แทน Array: ลบง่าย และกันใส่ซ้ำ

let reconnectedTimer: ReturnType<typeof setTimeout> | null = null;
// เก็บ id ของตัวตั้งเวลาซ่อน "เชื่อมต่อแล้ว" ไว้ยกเลิกได้
// ReturnType<typeof setTimeout> = ชนิดที่ setTimeout คืน (บน browser เป็น number)

function setState(next: ConnectionState) {
  if (next.status === state.status && next.justReconnected === state.justReconnected) return;
  // ค่าไม่เปลี่ยน → ไม่ต้องแจ้งใคร (กัน re-render ทั้งแอปทุกครั้งที่โหลดข้อมูลสำเร็จ)
  state = next;
  // ⚠ ต้องเป็น object ใหม่ ห้ามแก้ state.status = ... ตรง ๆ
  //   React เทียบด้วย === ถ้าเป็น object เดิม React จะคิดว่าไม่มีอะไรเปลี่ยน
  listeners.forEach((listener) => listener());   // แจ้งผู้ติดตามทุกคน
}

function setStatus(status: ConnectionStatus) {
  const wasDown = state.status !== 'online';           // ก่อนหน้านี้มีปัญหาอยู่ไหม
  const cameBack = wasDown && status === 'online';     // เพิ่งกลับมาออนไลน์ใช่ไหม

  if (cameBack) {
    if (reconnectedTimer) clearTimeout(reconnectedTimer);   // ยกเลิกตัวตั้งเวลาเก่า (ถ้ามี)
    reconnectedTimer = setTimeout(() => {
      reconnectedTimer = null;
      setState({ ...state, justReconnected: false });     // ครบ 3 วิ → ซ่อน "เชื่อมต่อแล้ว"
    }, RECONNECTED_SHOW_MS);
  }

  setState({
    status,
    justReconnected: cameBack ? true : status === 'online' ? state.justReconnected : false,
    // เพิ่งกลับมา                 → true
    // ออนไลน์อยู่แล้ว              → คงค่าเดิม (ไม่ตัดช่วง 3 วิทิ้งกลางคัน)
    // หลุดอีกรอบ (offline/unreach) → false
  });
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
  // คืนฟังก์ชันยกเลิก — React เรียกตอน component ถูกถอดออก
}

export function getConnectionState(): ConnectionState {
  return state;
  // ⚠ ต้องคืน object เดิมถ้าไม่มีอะไรเปลี่ยน
  //   ถ้าเขียน return { ...state } React จะเห็น object ใหม่ทุกครั้ง → render วนไม่จบ
}

// ===================== (ค) ช่องรายงานผล =====================

export function reportReachable(): void {
  setStatus('online');
  // เรียกเมื่อ request ไปถึง server — แม้ได้ 401/403/404 ก็นับว่า "ติดต่อได้"
}

export function reportUnreachable(): void {
  setStatus(navigator.onLine ? 'unreachable' : 'offline');
  // เครื่องไม่มีเน็ตอยู่แล้ว → บอก 'offline' (ตรงสาเหตุกว่า 'unreachable')
}

// ===================== (ง) ping + ตัวเฝ้าดู =====================

export async function pingServer(): Promise<boolean> {
  if (!navigator.onLine) {
    setStatus('offline');      // ไม่มีเน็ต ยิงไปก็ไม่ถึง
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  // fetch ไม่มี timeout ในตัว — ใช้ AbortController สั่งยกเลิกเองหลัง 5 วิ
  // (เน็ตแย่ ๆ fetch อาจค้างเป็นนาที)

  try {
    const res = await fetch('/api', { cache: 'no-store', signal: controller.signal });
    // cache: 'no-store' = ห้าม browser/service worker ตอบจาก cache ต้องถึง server จริง
    // signal = ผูกกับ controller ด้านบน → abort() แล้ว fetch จะโยน error
    if (res.ok) {
      setStatus('online');
      return true;
    }
    setStatus('unreachable');  // ได้ 5xx = proxy ต่อ backend ไม่ได้
    return false;
  } catch {
    setStatus(navigator.onLine ? 'unreachable' : 'offline');   // fetch ล้ม หรือ timeout
    return false;
  } finally {
    clearTimeout(timer);       // สำเร็จก่อน 5 วิ → ยกเลิกตัวตั้งเวลา
  }
}

export function startConnectionMonitor(): () => void {
  const handleOffline = () => setStatus('offline');
  // browser แจ้งว่าการ์ดเน็ตหลุด → เชื่อได้เลย

  const handleOnline = () => { void pingServer(); };
  // browser แจ้งว่าการ์ดเน็ตกลับมา → ยังไม่เชื่อ ต้อง ping ยืนยันว่าถึง server จริง
  // void = ตั้งใจไม่รอผล (event handler ไม่ต้อง async)

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  const interval = setInterval(() => {
    if (state.status !== 'online') void pingServer();
    // ping เฉพาะตอนมีปัญหา — ออนไลน์ปกติไม่ยิงเพิ่ม
  }, PING_INTERVAL_MS);

  return () => {
    // ฟังก์ชันหยุดเฝ้า — ตอนนี้ยังไม่มีใครเรียก เผื่อใช้ในเทสต์
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}
