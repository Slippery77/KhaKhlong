import { RotateCcw, Filter } from 'lucide-react';
import { ACTION_TYPE_CONFIG } from '../types';

export interface UserOption {
  user_id: string;
  display_name: string;
  username: string;
}

interface AuditFiltersProps {
  actionType: string;
  onActionTypeChange: (val: string) => void;
  userId: string;
  onUserIdChange: (val: string) => void;
  from: string;
  onFromChange: (val: string) => void;
  to: string;
  onToChange: (val: string) => void;
  users: UserOption[];
  onReset: () => void;
}

export function AuditFilters({
  actionType,
  onActionTypeChange,
  userId,
  onUserIdChange,
  from,
  onFromChange,
  to,
  onToChange,
  users,
  onReset,
}: AuditFiltersProps) {
  const hasActiveFilters = Boolean(actionType || userId || from || to);

  return (
    <div className="bg-white p-4 rounded-2xl border border-[#d9c6b0] shadow-xs space-y-3 font-kanit">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8DFD5]">
        <div className="flex items-center gap-2 text-sm font-medium text-[#2D241E]">
          <Filter className="w-4 h-4 text-[#8C6D58]" />
          <span>ตัวกรองการค้นหา</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs text-[#8C6D58] hover:text-[#7a5c45] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างตัวกรอง</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        {/* Action Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">ประเภทเหตุการณ์</label>
          <select
            value={actionType}
            onChange={(e) => onActionTypeChange(e.target.value)}
            className="w-full bg-[#FAF7F2] border border-[#d9c6b0] rounded-xl px-3 py-2 text-sm text-[#2D241E] focus:outline-none focus:ring-2 focus:ring-[#8C6D58] transition-colors"
          >
            <option value="">ทั้งหมดทุกประเภท</option>
            {Object.entries(ACTION_TYPE_CONFIG).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* User */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">ผู้ดำเนินการ</label>
          <select
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            className="w-full bg-[#FAF7F2] border border-[#d9c6b0] rounded-xl px-3 py-2 text-sm text-[#2D241E] focus:outline-none focus:ring-2 focus:ring-[#8C6D58] transition-colors"
          >
            <option value="">ทั้งหมดทุกคน</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.display_name} (@{u.username})
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">ตั้งแต่วันที่</label>
          <div className="relative">
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#d9c6b0] rounded-xl px-3 py-2 text-sm text-[#2D241E] focus:outline-none focus:ring-2 focus:ring-[#8C6D58] transition-colors"
            />
          </div>
        </div>

        {/* To Date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">ถึงวันที่</label>
          <div className="relative">
            <input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#d9c6b0] rounded-xl px-3 py-2 text-sm text-[#2D241E] focus:outline-none focus:ring-2 focus:ring-[#8C6D58] transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
