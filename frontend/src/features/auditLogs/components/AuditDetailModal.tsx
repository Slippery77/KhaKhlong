import { useState } from 'react';
import { X, Copy, Check, Clock, Globe, Laptop, User, Tag } from 'lucide-react';
import type { AuditLogItem } from '../types';
import { ACTION_TYPE_CONFIG } from '../types';

interface AuditDetailModalProps {
  item: AuditLogItem | null;
  onClose: () => void;
}

export function AuditDetailModal({ item, onClose }: AuditDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const config = ACTION_TYPE_CONFIG[item.action_type] || {
    label: item.action_type,
    badgeClass: 'bg-stone-100 text-stone-700 border border-stone-200',
    description: 'บันทึกเหตุการณ์ความปลอดภัย',
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(item.metadata, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const date = new Date(item.created_at);
  const formattedDate = !isNaN(date.getTime())
    ? date.toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : item.created_at || '-';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FAF7F2] rounded-2xl shadow-xl border border-[#d9c6b0] overflow-hidden flex flex-col max-h-[90vh] font-kanit animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8DFD5] bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EFE8DC] rounded-xl text-[#8C6D58]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 id="audit-detail-title" className="text-lg font-semibold text-[#2D241E]">
                รายละเอียด Audit Log
              </h3>
              <p className="text-xs text-stone-500 font-normal">
                รหัสรายการ: {item.log_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-[#EFE8DC]/60 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C6D58]"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Action Badge & Summary */}
          <div className="bg-white p-4 rounded-xl border border-[#E8DFD5] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.badgeClass}`}
              >
                {config.label}
              </span>
              <span className="text-xs text-stone-500 font-mono">
                {item.action_type}
              </span>
            </div>
            <p className="text-sm text-stone-600">{config.description}</p>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3.5 rounded-xl border border-[#E8DFD5] flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#8C6D58] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-stone-500">วันและเวลาที่บันทึก</p>
                <p className="font-medium text-[#2D241E]">{formattedDate}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#E8DFD5] flex items-start gap-3">
              <User className="w-4 h-4 text-[#8C6D58] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-stone-500">ผู้ดำเนินการ</p>
                <p className="font-medium text-[#2D241E]">
                  {item.user_display_name || item.username || 'ระบบอัตโนมัติ / ไม่มีบัญชี'}
                </p>
                {item.username && (
                  <p className="text-xs text-stone-400">@{item.username}</p>
                )}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#E8DFD5] flex items-start gap-3">
              <Globe className="w-4 h-4 text-[#8C6D58] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-stone-500">IP Address</p>
                <p className="font-medium text-[#2D241E] font-mono text-xs truncate">
                  {item.ip_address || '-'}
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#E8DFD5] flex items-start gap-3">
              <Laptop className="w-4 h-4 text-[#8C6D58] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-stone-500">ข้อมูลอุปกรณ์ / Client</p>
                <p className="font-medium text-[#2D241E] text-xs truncate" title={item.device_info}>
                  {item.device_info || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-700">
                ข้อมูลเพิ่มเติม (Metadata & Changes)
              </label>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#8C6D58] bg-[#EFE8DC]/50 hover:bg-[#EFE8DC] rounded-lg transition-colors cursor-pointer border border-[#d9c6b0]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอก JSON</span>
                  </>
                )}
              </button>
            </div>

            {/* Formatted Viewer */}
            {item.metadata && Object.keys(item.metadata).length > 0 ? (
              <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto max-h-56 leading-relaxed border border-stone-800">
                {JSON.stringify(item.metadata, null, 2)}
              </pre>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-[#E8DFD5] text-center text-xs text-stone-500">
                ไม่มีข้อมูล metadata เพิ่มเติมในเหตุการณ์นี้
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8DFD5] bg-[#FAF7F2] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-[#8C6D58] hover:bg-[#7a5c45] rounded-xl transition-colors cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#8C6D58]"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
