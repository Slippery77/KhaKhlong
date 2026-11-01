import { useSyncExternalStore } from 'react';

/**
 * สถานะ "เปิด/ปิด" หน้าต่างรายการค้างส่ง (OutboxPanel)
 *
 * ทำไมไม่ใช้ useState ธรรมดา
 * ปุ่มเปิดอยู่หลายที่ (ป้ายสถานะ, เมนู Header, หน้าปิดกะ) แต่หน้าต่างมีตัวเดียววางใน App
 * ถ้าใช้ useState ต้องส่ง props ผ่านหลายชั้น — ใช้ store ตัวเล็กแบบเดียวกับ connectionStatus แทน
 */

let isOpen = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function openOutboxPanel(): void {
  isOpen = true;
  emit();
}

export function closeOutboxPanel(): void {
  isOpen = false;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** true = หน้าต่างเปิดอยู่ */
export function useOutboxPanelOpen(): boolean {
  return useSyncExternalStore(subscribe, () => isOpen);
}