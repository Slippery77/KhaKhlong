import { useSyncExternalStore } from 'react';
import { getConnectionState, subscribeConnection, type ConnectionState } from '../connectionStatus';

export function useConnectionStatus(): ConnectionState {
  return useSyncExternalStore(subscribeConnection, getConnectionState);
  // argument 1 = subscribe: React เรียกครั้งเดียวเพื่อสมัครรับแจ้งเตือน
  // argument 2 = getSnapshot: React เรียกทุก render เพื่ออ่านค่าปัจจุบัน
  // ค่าเปลี่ยน → listener ถูกเรียก → React เรียก getSnapshot → ได้ object ใหม่ → re-render
}