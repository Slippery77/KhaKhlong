import { Eye, Clock, User, Globe, Laptop, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogItem, AuditPagination } from '../types';
import { ACTION_TYPE_CONFIG } from '../types';

interface AuditTableProps {
  logs: AuditLogItem[];
  pagination: AuditPagination;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onViewDetail: (item: AuditLogItem) => void;
}

export function AuditTable({
  logs,
  pagination,
  loading,
  onPageChange,
  onViewDetail,
}: AuditTableProps) {
  const { page, total_pages, total } = pagination;

  return (
    <div className="w-full min-w-0 max-w-full bg-white rounded-2xl border border-[#d9c6b0] shadow-xs overflow-hidden font-kanit">
      {/* ── Desktop View (md ขึ้นไป): ตารางเต็ม 5 คอลัมน์ ── */}
      <div className="hidden md:block overflow-x-auto min-w-0 w-full">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-[#FAF7F2] border-b border-[#E8DFD5] text-xs font-medium text-stone-600">
              <th className="py-3.5 px-4 whitespace-nowrap">วันและเวลา</th>
              <th className="py-3.5 px-4 whitespace-nowrap">การกระทำ (Action)</th>
              <th className="py-3.5 px-4 whitespace-nowrap">ผู้ดำเนินการ</th>
              <th className="py-3.5 px-4 whitespace-nowrap">IP / อุปกรณ์</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">รายละเอียด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8DFD5]/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-stone-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#8C6D58] border-t-transparent rounded-full animate-spin" />
                    <span>กำลังโหลดข้อมูล Audit Log...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-stone-400">
                  ไม่พบรายการบันทึก Audit Log ตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              logs.map((item) => {
                const config = ACTION_TYPE_CONFIG[item.action_type] || {
                  label: item.action_type,
                  badgeClass: 'bg-stone-100 text-stone-700 border border-stone-200',
                  description: '',
                };

                const date = new Date(item.created_at);
                const dateStr = !isNaN(date.getTime())
                  ? date.toLocaleString('th-TH', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })
                  : item.created_at || '-';

                return (
                  <tr
                    key={item.log_id}
                    className="hover:bg-[#FAF7F2]/50 transition-colors duration-150 group"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#2D241E] font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{dateStr}</span>
                      </div>
                    </td>

                    {/* Action Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.badgeClass}`}
                        title={item.action_type}
                      >
                        {config.label}
                      </span>
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58] shrink-0 text-xs font-medium">
                          {item.user_display_name ? item.user_display_name[0] : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#2D241E]">
                            {item.user_display_name || item.username || 'ระบบ / ไม่มีบัญชี'}
                          </p>
                          {item.username && (
                            <p className="text-[11px] text-stone-400">@{item.username}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* IP & Device */}
                    <td className="py-3.5 px-4 text-xs text-stone-600 max-w-xs">
                      <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
                        <Globe className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                        <span>{item.ip_address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-400 text-[11px] truncate mt-0.5" title={item.device_info}>
                        <Laptop className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                        <span className="truncate">{item.device_info}</span>
                      </div>
                    </td>

                    {/* Action button */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewDetail(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8C6D58] bg-[#EFE8DC]/60 hover:bg-[#EFE8DC] rounded-xl transition-colors cursor-pointer border border-[#d9c6b0] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูข้อมูล</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile View (< md): รูปแบบ Floating Cards ไม่หลุดขอบจอ ── */}
      <div className="md:hidden p-3 bg-[#FAF7F2]/60 space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-stone-400 bg-white rounded-xl border border-[#E8DFD5]/80">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#8C6D58] border-t-transparent rounded-full animate-spin" />
              <span>กำลังโหลดข้อมูล Audit Log...</span>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm bg-white rounded-xl border border-[#E8DFD5]/80">
            ไม่พบรายการบันทึก Audit Log ตามเงื่อนไขที่เลือก
          </div>
        ) : (
          logs.map((item) => {
            const config = ACTION_TYPE_CONFIG[item.action_type] || {
              label: item.action_type,
              badgeClass: 'bg-stone-100 text-stone-700 border border-stone-200',
              description: '',
            };

            const date = new Date(item.created_at);
            const dateStr = !isNaN(date.getTime())
              ? date.toLocaleString('th-TH', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                })
              : item.created_at || '-';

            return (
              <div
                key={item.log_id}
                className="bg-white rounded-xl border border-[#E8DFD5]/80 p-3.5 shadow-2xs space-y-2.5"
              >
                {/* แถวที่ 1: Action Badge + เวลา */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}
                  >
                    {config.label}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                {/* แถวที่ 2: ผู้ดำเนินการ */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58] shrink-0 text-xs font-semibold">
                    {item.user_display_name ? item.user_display_name[0] : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#2D241E] truncate">
                      {item.user_display_name || item.username || 'ระบบ / ไม่มีบัญชี'}
                    </p>
                    {item.username && (
                      <p className="text-xs text-stone-400 truncate">@{item.username}</p>
                    )}
                  </div>
                </div>

                {/* แถวที่ 3: กล่องข้อมูล IP & อุปกรณ์ + ปุ่มดูข้อมูล */}
                <div className="bg-[#FAF7F2] rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs border border-[#E8DFD5]/50">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-stone-600 font-mono text-[11px] truncate">
                      <Globe className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                      <span className="truncate">{item.ip_address || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-400 text-[11px] truncate" title={item.device_info}>
                      <Laptop className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                      <span className="truncate">{item.device_info || '-'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewDetail(item)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8C6D58] bg-white hover:bg-[#EFE8DC] rounded-xl transition-colors cursor-pointer border border-[#d9c6b0] shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูข้อมูล</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-[#E8DFD5] bg-[#FAF7F2] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-stone-600">
        <div className="text-center sm:text-left">
          แสดงรายการทั้งหมด <span className="font-semibold text-[#2D241E]">{total}</span> รายการ (หน้า {page} จาก {total_pages})
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 rounded-xl border border-[#d9c6b0] bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>ก่อนหน้า</span>
          </button>

          <span className="text-xs text-stone-500 font-medium px-1">
            {page} / {total_pages || 1}
          </span>

          <button
            type="button"
            disabled={page >= total_pages || loading}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 rounded-xl border border-[#d9c6b0] bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
