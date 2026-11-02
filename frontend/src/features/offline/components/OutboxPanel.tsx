import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Clock, Loader2, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import type { DiningTable } from '../../tables/types/table.types';
import type { FullMenuData } from '../../mainpos/types/item.types';
import { db, type OutboxEntry } from '../db';
import { flushOutbox } from '../flush';
import { useOutbox } from '../hooks/useOutbox';
import { discardOrder, retryOrder } from '../outbox';
import { closeOutboxPanel, useOutboxPanelOpen } from '../outboxPanel';

/** 1 บิลในหน้าต่าง = รวมทุกแถวของ orderId เดียวกัน */
interface OrderGroup {
  orderId: string;
  entries: OutboxEntry[];
  status: 'pending' | 'failed'; // มีแถวไหน failed = ทั้งบิล failed
  lastError: string | null;
  createdAt: number; // เวลาของแถวแรก
  isNewBill: boolean; // มีแถว createOrder = บิลที่เปิดตอนออฟไลน์
  tableId: string | null; // รู้เฉพาะบิลใหม่ (อยู่ใน payload ของ createOrder)
  isMine: boolean; // ของผู้ใช้ที่ login อยู่
}

/** จัดกลุ่มแถวตาม orderId — entries เรียงตาม seq มาแล้ว กลุ่มจึงเรียงตามบิลที่สั่งก่อน */
function groupByOrder(entries: OutboxEntry[], userId: string | undefined): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();
  for (const entry of entries) {
    let group = groups.get(entry.orderId);
    if (!group) {
      group = {
        orderId: entry.orderId,
        entries: [],
        status: 'pending',
        lastError: null,
        createdAt: entry.createdAt,
        isNewBill: false,
        tableId: null,
        isMine: entry.userId === userId,
      };
      groups.set(entry.orderId, group);
    }
    group.entries.push(entry);
    if (entry.status === 'failed') {
      group.status = 'failed';
      group.lastError = entry.lastError;
    } else if (!group.lastError && entry.lastError) {
      group.lastError = entry.lastError; // pending ที่เคยลองแล้ว เช่น "ติดต่อเซิร์ฟเวอร์ไม่ได้"
    }
    if (entry.kind === 'createOrder') {
      group.isNewBill = true;
      group.tableId = entry.payload.tableId;
    }
  }
  return [...groups.values()];
}

const timeFormat = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });

/**
 * หน้าต่างรายการออเดอร์ที่ยังไม่ถึง server (ตัดสินใจ E: เปิดจากป้ายสถานะ)
 * ดู / ลองส่งใหม่ / ลบ — วางไว้ตัวเดียวใน App เปิดจากที่ไหนก็ได้ด้วย openOutboxPanel()
 */
export default function OutboxPanel() {
  const isOpen = useOutboxPanelOpen();
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug;
  const { entries } = useOutbox(tenantSlug);

  // ชื่อโต๊ะ/ชื่อเมนูจาก snapshot — outbox เก็บแค่ id (ข้อมูลที่ server ต้องการ)
  const tables = useLiveQuery(
    async () =>
      tenantSlug ? ((await db.snapshots.get([tenantSlug, 'tables']))?.data as DiningTable[] | undefined) : undefined,
    [tenantSlug],
  );
  const menu = useLiveQuery(
    async () =>
      tenantSlug ? ((await db.snapshots.get([tenantSlug, 'menu']))?.data as FullMenuData | undefined) : undefined,
    [tenantSlug],
  );

  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);

  // กด Esc ปิดหน้าต่าง
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOutboxPanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const groups = groupByOrder(entries, user?.sub);
  const menuName = new Map(
    (menu?.categories ?? []).flatMap((c) => c.items).map((item) => [item.menu_item_id, item.name] as const),
  );

  /** ชื่อโต๊ะ: บิลใหม่ดูจาก tableId · บิลเดิมหาโต๊ะที่ open_order_id ตรงกัน */
  const tableLabel = (group: OrderGroup): string => {
    const table = tables?.find((t) =>
      group.tableId ? t.table_id === group.tableId : t.open_order_id === group.orderId,
    );
    return table ? `โต๊ะ ${table.table_number}` : 'ไม่ทราบโต๊ะ';
  };

  /** "ข้าวผัด ×2, ต้มยำ" — รวมจานเมนูเดียวกัน */
  const itemSummary = (group: OrderGroup): string => {
    const counts = new Map<string, number>();
    for (const entry of group.entries) {
      if (entry.kind !== 'addItems') continue;
      for (const item of entry.payload.items) {
        const name = menuName.get(item.menuItemId) ?? 'เมนูที่ไม่รู้จัก';
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(', ') || '—';
  };

  const retry = async (orderId: string) => {
    setBusyOrderId(orderId);
    await retryOrder(orderId); // failed → pending
    await flushOutbox(); // ส่งทันที ไม่ต้องรอรอบ 30 วินาที
    setBusyOrderId(null);
  };

  const discard = async (orderId: string) => {
    setBusyOrderId(orderId);
    await discardOrder(orderId);
    setConfirmDeleteId(null);
    setBusyOrderId(null);
  };

  const sendAll = async () => {
    setIsFlushing(true);
    await flushOutbox();
    setIsFlushing(false);
  };

  const button =
    'flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    // พื้นหลังมืด — กดนอกกล่องเพื่อปิด
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/30 p-4 font-kanit sm:items-center"
      onClick={closeOutboxPanel}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="outbox-panel-title"
        onClick={(event) => event.stopPropagation()} // กดในกล่องไม่ปิด
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white text-[#2D241E] shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#E8DFD5] p-4">
          <div>
            <h2 id="outbox-panel-title" className="text-base font-bold">
              ออเดอร์ที่ยังไม่ถึงครัว
            </h2>
            <p className="mt-0.5 text-xs text-[#7A6A5C]">
              เก็บไว้ในเครื่องนี้เท่านั้น · ส่งให้อัตโนมัติเมื่อติดต่อเซิร์ฟเวอร์ได้
            </p>
          </div>
          <button
            type="button"
            onClick={closeOutboxPanel}
            aria-label="ปิด"
            className="cursor-pointer rounded-lg p-1 text-[#2D241E]/60 hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {groups.length === 0 && (
            <p className="py-8 text-center text-sm text-[#7A6A5C]">ส่งครบแล้ว ไม่มีรายการค้าง</p>
          )}

          {groups.map((group) => {
            const isBusy = busyOrderId === group.orderId;
            const isFailed = group.status === 'failed';
            return (
              <article
                key={group.orderId}
                className={`rounded-xl border p-3 ${isFailed ? 'border-[#F4C7C3] bg-[#FEF3F2]' : 'border-[#E8DFD5]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {tableLabel(group)}
                      {group.isNewBill && <span className="ml-1.5 text-xs font-normal text-[#7A6A5C]">· บิลใหม่</span>}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[#5C4A3D]">{itemSummary(group)}</p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isFailed ? 'bg-[#B42318] text-white' : 'bg-[#EFE8DC] text-[#6B5140]'
                    }`}
                  >
                    {isFailed ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
                    {isFailed ? 'ส่งไม่สำเร็จ' : 'รอส่ง'}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#7A6A5C]">
                  สั่งเมื่อ {timeFormat.format(group.createdAt)} น.
                  {!group.isMine && ' · ของผู้ใช้อื่น (ส่งเมื่อคนนั้นเข้าสู่ระบบ)'}
                </p>
                {group.lastError && (
                  <p className={`mt-1 text-xs ${isFailed ? 'text-[#B42318]' : 'text-[#7A6A5C]'}`}>
                    สาเหตุ: {group.lastError}
                  </p>
                )}

                {/* ปุ่ม — รายการรอส่งไม่ต้องมีปุ่มลองใหม่ (ส่งเองอัตโนมัติ) */}
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {confirmDeleteId === group.orderId ? (
                    <>
                      <span className="mr-auto self-center text-xs text-[#B42318]">
                        ลบแล้วครัวจะไม่ได้รับรายการนี้ และกู้คืนไม่ได้
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className={`${button} border border-[#d9c6b0] bg-white hover:bg-[#FAF7F2]`}
                      >
                        ไม่ลบ
                      </button>
                      <button
                        type="button"
                        onClick={() => discard(group.orderId)}
                        disabled={isBusy}
                        className={`${button} bg-[#B42318] text-white hover:bg-[#912018]`}
                      >
                        ยืนยันลบ
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(group.orderId)}
                        disabled={isBusy}
                        className={`${button} text-[#B42318] hover:bg-[#FEE4E2]`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ลบ
                      </button>
                      {isFailed && (
                        <button
                          type="button"
                          onClick={() => retry(group.orderId)}
                          disabled={isBusy}
                          className={`${button} bg-[#8C6D58] text-white hover:bg-[#7a5c45]`}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          ลองส่งอีกครั้ง
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {groups.some((g) => g.status === 'pending') && (
          <footer className="flex justify-end border-t border-[#E8DFD5] p-3">
            <button
              type="button"
              onClick={sendAll}
              disabled={isFlushing}
              className={`${button} border border-[#d9c6b0] bg-white text-[#5C4A3D] hover:bg-[#FAF7F2]`}
            >
              {isFlushing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              ส่งตอนนี้
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}