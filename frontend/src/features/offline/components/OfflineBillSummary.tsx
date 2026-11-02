import { useLiveQuery } from 'dexie-react-hooks';
import { WifiOff } from 'lucide-react';
import type { DiningTable } from '../../tables/types/table.types';
import { db } from '../db';

interface OfflineBillSummaryProps {
  tenantSlug: string;
  tableId: string;
}

const timeFormat = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });

/**
 * (ค) เข้าโต๊ะที่มีบิลเปิดอยู่ตอนออฟไลน์
 *
 * รายการเดิมในบิลต้องดึงจาก GET /orders/:id ซึ่งไม่ได้แคชไว้ → ตะกร้าว่าง
 * พนักงานจะงงว่า "บิลหายไหม" → แสดงสรุปจากผังโต๊ะในเครื่อง (จำนวนรายการ + ยอด) ให้รู้ว่ายังอยู่
 * สั่งเพิ่มได้ตามปกติ (หย่อนลง outbox เข้าบิลเดิม) · กลับมาออนไลน์ หน้า POS โหลดรายการจริงให้เอง
 */
export default function OfflineBillSummary({ tenantSlug, tableId }: OfflineBillSummaryProps) {
  // useLiveQuery: หย่อนรายการใหม่ (enqueue แก้ snapshot โต๊ะ) ตัวเลขตรงนี้ขยับตามทันที
  const snapshot = useLiveQuery(() => db.snapshots.get([tenantSlug, 'tables']), [tenantSlug]);
  const table = (snapshot?.data as DiningTable[] | undefined)?.find((t) => t.table_id === tableId);

  if (!snapshot || !table || table.item_count === 0) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-[#d9c6b0] bg-[#F3EDE4] px-4 py-2.5 text-sm text-[#2D241E]"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-[#8C6D58]" aria-hidden="true" />
      <span className="flex-1">
        บิลนี้มี <span className="font-semibold">{table.item_count} รายการ</span> ยอด{' '}
        <span className="font-semibold">
          ฿{Number(table.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </span>{' '}
        <span className="text-[#2D241E]/70">
          (ข้อมูล ณ {timeFormat.format(snapshot.savedAt)} น.) · ดูรายละเอียดได้เมื่อเชื่อมต่ออีกครั้ง สั่งเพิ่มได้ตามปกติ
        </span>
      </span>
    </div>
  );
}