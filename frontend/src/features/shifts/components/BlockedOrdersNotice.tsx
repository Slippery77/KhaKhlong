import { CircleAlert } from 'lucide-react';
import type { BlockedOrder, BlockedOrderAction } from '../types/shift.types';

const ACTION_LABEL: Record<BlockedOrderAction, string> = {
  pay: 'ต้องเก็บเงินก่อนปิดกะ',
  close_unpaid: 'ปิดบิลว่าง (ต้องให้ผู้จัดการ)',
  in_progress: 'ยังมีรายการค้างในครัว',
};

interface BlockedOrdersNoticeProps {
  orders: BlockedOrder[];
}

export default function BlockedOrdersNotice({ orders }: BlockedOrdersNoticeProps) {
  if (orders.length === 0) return null;

  return (
    <section
      role="alert"
      className="rounded-2xl border border-[#F4C7C3] bg-[#FEF3F2] p-4"
    >
      <div className="flex items-start gap-2.5">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B42318]" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#B42318]">
            ยังปิดกะไม่ได้ — มีบิลค้าง {orders.length} ใบ
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#8A3A32]">
            ปิดบิลทั้งหมดให้เรียบร้อยก่อน แล้วค่อยกลับมานับเงินและปิดกะอีกครั้ง
          </p>
          <ul className="mt-3 space-y-1.5">
            {orders.map((order) => (
              <li
                key={order.orderId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-[#5C4A3D]"
              >
                <span className="font-medium">
                  บิล #{order.orderNumber}
                  {order.tableNumber ? ` · โต๊ะ ${order.tableNumber}` : ''}
                </span>
                <span className="text-[#8A6F5C]">
                  {order.activeItemCount} รายการ · {ACTION_LABEL[order.suggestedAction]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
