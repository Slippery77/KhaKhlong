import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../auth/context/AuthContext';
import type { DiningTable } from '../../tables/types/table.types';
import type { FullMenuData } from '../../mainpos/types/item.types';
import type { Shift } from '../../shifts/types/shift.types';
import { db } from '../db';
import { discardOrder, enqueueOrder, retryOrder } from '../outbox';
import { flushOutbox, type FlushResult } from '../flush';
import { useOutbox } from '../hooks/useOutbox';

/**
 * หน้าทดสอบ outbox — มีเฉพาะตอน npm run dev (ดู AppRouter)
 * ใช้ข้อมูลโต๊ะ/เมนู/กะ จาก snapshot → ต้องเปิดหน้าโต๊ะและหน้า POS สักครั้งก่อน
 */
export default function OutboxDevPage() {
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug;
  const { entries, pendingCount, failedCount } = useOutbox(tenantSlug);

  // อ่าน snapshot แบบสด (เปลี่ยนเมื่อหน้าอื่นโหลดข้อมูลใหม่)
  const tables = useLiveQuery(
    async () => (tenantSlug ? (await db.snapshots.get([tenantSlug, 'tables']))?.data as DiningTable[] : undefined),
    [tenantSlug],
  );
  const menu = useLiveQuery(
    async () => (tenantSlug ? (await db.snapshots.get([tenantSlug, 'menu']))?.data as FullMenuData : undefined),
    [tenantSlug],
  );
  const shift = useLiveQuery(
    async () => (tenantSlug ? (await db.snapshots.get([tenantSlug, 'currentShift']))?.data as Shift | null : undefined),
    [tenantSlug],
  );

  const menuItems = menu?.categories.flatMap((c) => c.items) ?? [];
  const [tableId, setTableId] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (line: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString('th-TH')} ${line}`, ...prev].slice(0, 20));

  if (!user || !tenantSlug) return <p className="p-6">ต้อง login ก่อน</p>;

  const selectedTable = tables?.find((t) => t.table_id === tableId);

  const enqueue = async () => {
    if (!selectedTable || !menuItemId) return;
    const { orderId } = await enqueueOrder({
      tenantSlug,
      userId: user.sub,
      shiftId: shift?.shiftId ?? null,
      tableId: selectedTable.table_id,
      orderId: selectedTable.open_order_id, // null = เปิดบิลใหม่
      items: Array.from({ length: quantity }, () => ({ menuItemId })),
    });
    addLog(`หย่อน ${quantity} จาน โต๊ะ ${selectedTable.table_number} บิล ${orderId.slice(0, 8)}`);
    addLog(`flush: ${await flushOutbox()}`);
  };

  const flush = async () => {
    const result: FlushResult = await flushOutbox();
    addLog(`flush: ${result}`);
  };

  const box = 'rounded-2xl border border-[#E8DFD5] bg-white p-4';
  const button =
    'cursor-pointer rounded-xl bg-[#8C6D58] px-3 py-1.5 text-sm text-white transition-colors duration-200 hover:bg-[#7a5c45] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6 font-kanit text-[#2D241E]">
      <h1 className="text-lg font-bold">Outbox (dev)</h1>
      <p className="mb-4 text-sm opacity-70">
        ร้าน {tenantSlug} · ผู้ใช้ {user.username} · กะ {shift?.shiftId?.slice(0, 8) ?? 'ไม่มีใน snapshot'} · รอส่ง {pendingCount} · ล้ม {failedCount}
      </p>

      <section className={`${box} mb-4 flex flex-wrap items-end gap-3`}>
        <label className="text-sm">
          โต๊ะ
          <select className="mt-1 block rounded-lg border p-1.5" value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">— เลือก —</option>
            {tables?.map((t) => (
              <option key={t.table_id} value={t.table_id}>
                {t.table_number} {t.open_order_id ? `(บิล ${t.open_order_id.slice(0, 8)})` : '(ว่าง)'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          เมนู
          <select className="mt-1 block rounded-lg border p-1.5" value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}>
            <option value="">— เลือก —</option>
            {menuItems.map((m) => (
              <option key={m.menu_item_id} value={m.menu_item_id}>
                {m.name} {m.is_available ? '' : '(หมด)'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          จำนวน
          <input type="number" min={1} max={10} className="mt-1 block w-16 rounded-lg border p-1.5" value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
        </label>
        <button type="button" className={button} disabled={!tableId || !menuItemId} onClick={enqueue}>หย่อน + flush</button>
        <button type="button" className={button} onClick={flush}>flush อย่างเดียว</button>
      </section>

      <section className={`${box} mb-4 overflow-x-auto`}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-1">seq</th><th className="p-1">kind</th><th className="p-1">บิล</th>
              <th className="p-1">สถานะ</th><th className="p-1">ครั้ง</th><th className="p-1">error</th><th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.seq} className="border-b last:border-0">
                <td className="p-1">{e.seq}</td>
                <td className="p-1">{e.kind}{e.kind === 'addItems' ? ` ×${e.payload.items.length}` : ''}</td>
                <td className="p-1 font-mono">{e.orderId.slice(0, 8)}</td>
                <td className="p-1">{e.status}</td>
                <td className="p-1">{e.attempts}</td>
                <td className="p-1">{e.lastError}</td>
                <td className="p-1 whitespace-nowrap">
                  {e.status === 'failed' && (
                    <button type="button" className="mr-2 cursor-pointer text-[#8C6D58] underline"
                      onClick={async () => { await retryOrder(e.orderId); addLog(`retry: ${await flushOutbox()}`); }}>
                      ลองส่งอีกครั้ง
                    </button>
                  )}
                  <button type="button" className="cursor-pointer text-rose-600 underline" onClick={() => discardOrder(e.orderId)}>
                    ลบบิลนี้
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td className="p-1 opacity-60" colSpan={7}>outbox ว่าง</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className={box}>
        <h2 className="mb-2 text-sm font-medium">log</h2>
        <pre className="text-xs">{log.join('\n')}</pre>
      </section>
    </div>
  );
}