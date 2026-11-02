import { useEffect, useRef, useState } from 'react';

export interface UsePageVisibilityOptions {
    /** ฟังก์ชันที่ต้องการให้รันเมื่อหน้าจอกลับมา active (visible / window focus / reconnect online) */
    onVisible?: () => void;
    /** หน่วงเวลากัน event ซ้อนกันในระดับมิลลิวินาที (default: 1000 ms) */
    throttleMs?: number;
}

/**
 * Hook ตรวจจับสถานะการแสดงผลของหน้าเว็บ (Page Visibility API + Focus + Online)
 * ตามแนวทาง UI/UX Pro Max: ช่วยประหยัดแบตเตอรี่, CPU, และลด Polling ที่ไม่จำเป็นเมื่อผู้ใช้พับแท็บหรือดับหน้าจอ
 * พร้อมดึงข้อมูลล่าสุดอัตโนมัติทันทีที่กลับมามองเห็นอย่างราบรื่น
 */
export function usePageVisibility(options?: UsePageVisibilityOptions): boolean {
    const [isVisible, setIsVisible] = useState<boolean>(() => {
        if (typeof document === 'undefined') return true;
        return !document.hidden;
    });

    const onVisibleRef = useRef(options?.onVisible);
    const lastTriggerRef = useRef<number>(0);
    const throttleMs = options?.throttleMs ?? 1000;

    useEffect(() => {
        onVisibleRef.current = options?.onVisible;
    }, [options?.onVisible]);

    useEffect(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return;

        const handleCheck = () => {
            const currentlyVisible = !document.hidden;
            setIsVisible(currentlyVisible);

            // เมื่อกลับมามองเห็น (visible) และหน้าต่าง active
            if (currentlyVisible) {
                const now = Date.now();
                if (now - lastTriggerRef.current >= throttleMs) {
                    lastTriggerRef.current = now;
                    onVisibleRef.current?.();
                }
            }
        };

        document.addEventListener('visibilitychange', handleCheck);
        window.addEventListener('focus', handleCheck);
        window.addEventListener('online', handleCheck);

        return () => {
            document.removeEventListener('visibilitychange', handleCheck);
            window.removeEventListener('focus', handleCheck);
            window.removeEventListener('online', handleCheck);
        };
    }, [throttleMs]);

    return isVisible;
}

