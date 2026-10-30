import { useCallback, useEffect, useRef, useState } from "react";
import { BadgePercent, Loader2, ShieldCheck, X, XCircle } from "lucide-react";
import { PinInput } from "../../registerOwner/components/PinInput";

export type ItemActionVariant = "void" | "comp";

interface ItemActionModalProps {
  isOpen: boolean;
  variant: ItemActionVariant;
  itemName: string;
  /** จำนวนรายการที่จะดำเนินการจริง (นับเฉพาะรายการที่สถานะเข้าเงื่อนไข) */
  quantity: number;
  onClose: () => void;
  onConfirm: (payload: { reason: string; approverPin: string }) => Promise<void> | void;
  loading?: boolean;
  /** ข้อความผิดพลาดจาก server (เช่น PIN ไม่ถูกต้อง) */
  error?: string | null;
}

const VARIANTS = {
  void: {
    title: "ยกเลิกรายการ (Void)",
    icon: XCircle,
    iconWrap: "bg-rose-50 text-rose-600 border-rose-100",
    confirmLabel: "ยืนยันยกเลิก",
    confirmClass: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500",
    warning: "การยกเลิกไม่สามารถย้อนกลับได้ และรายการจะถูกตัดออกจากยอดบิล",
    reasonPlaceholder: "ระบุเหตุผล เช่น ลูกค้ายกเลิก, สั่งผิด, วัตถุดิบหมด",
  },
  comp: {
    title: "Comp รายการ",
    icon: BadgePercent,
    iconWrap: "bg-amber-50 text-amber-700 border-amber-100",
    confirmLabel: "ยืนยัน Comp",
    confirmClass: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
    warning: "การ Comp คือการให้ฟรี 100% และไม่สามารถย้อนกลับได้",
    reasonPlaceholder: "ระบุเหตุผล เช่น ลูกค้าไม่พอใจ, เสิร์ฟผิดโต๊ะ, ของหมด",
  },
} as const;

export default function ItemActionModal({
  isOpen,
  variant,
  itemName,
  quantity,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: ItemActionModalProps) {
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);
  const config = VARIANTS[variant];
  const Icon = config.icon;

  // เปิด modal ใหม่ (หรือเปลี่ยนรายการ) = เริ่มจากฟอร์มว่าง
  // ใช้วิธี "ปรับ state ระหว่าง render" ตามที่ React แนะนำ แทนการ setState ใน effect
  const formKey = isOpen ? `${variant}|${itemName}` : null;
  const [lastFormKey, setLastFormKey] = useState<string | null>(null);
  if (formKey !== lastFormKey) {
    setLastFormKey(formKey);
    setReason("");
    setPin("");
    setLocalError(null);
  }

  const handleClose = useCallback(() => {
    if (loading) return;
    setReason("");
    setPin("");
    setLocalError(null);
    onClose();
  }, [loading, onClose]);

  // โฟกัสช่องเหตุผลเมื่อเปิด (แตะ DOM เท่านั้น ไม่ set state ใน effect)
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => reasonRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, itemName, variant]);

  // ล็อกการเลื่อนพื้นหลัง + ปิดด้วย Esc
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setLocalError("กรุณาระบุเหตุผลก่อนยืนยัน");
      reasonRef.current?.focus();
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setLocalError("กรุณากรอก PIN ผู้อนุมัติให้ครบ 6 หลัก");
      return;
    }
    setLocalError(null);
    await onConfirm({ reason: trimmedReason, approverPin: pin });
  };

  const message = localError ?? error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 font-kanit">
      <div
        className="absolute inset-0 bg-[#2D241E]/45"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-action-title"
        aria-describedby="item-action-desc"
        className="relative w-full max-w-md rounded-2xl border border-[#E8DFD5] bg-[#FAF7F2] shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#E8DFD5] px-6 py-4">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.iconWrap}`}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="item-action-title" className="text-base font-semibold text-[#2D241E]">
              {config.title}
            </h2>
            <p id="item-action-desc" className="mt-0.5 text-xs text-[#7A6B5F]">
              ต้องมีผู้จัดการหรือเจ้าของร้านกรอก PIN เพื่ออนุมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="ปิดหน้าต่าง"
            className="cursor-pointer rounded-lg p-1.5 text-[#7A6B5F] transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-1 focus-visible:ring-offset-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="rounded-xl border border-[#E8DFD5] bg-white/70 px-4 py-3">
            <p className="truncate text-sm font-medium text-[#2D241E]">{itemName}</p>
            <p className="mt-1 text-xs text-[#7A6B5F]">
              จะดำเนินการ <span className="font-semibold text-[#2D241E]">{quantity}</span> รายการ
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-rose-700">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {config.warning}
            </p>
          </div>

          <div>
            <label htmlFor="item-action-reason" className="mb-1.5 block text-sm text-[#2D241E]">
              เหตุผล <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="item-action-reason"
              ref={reasonRef}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={config.reasonPlaceholder}
              rows={3}
              disabled={loading}
              aria-invalid={Boolean(localError) && !reason.trim()}
              className="w-full resize-none rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm text-[#2D241E] transition-colors duration-200 placeholder:text-[#A68874]/70 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/25 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="item-action-pin"
              className="mb-1.5 block text-sm text-[#2D241E]"
            >
              PIN ผู้อนุมัติ <span className="text-rose-600">*</span>
            </label>
            <PinInput
              id="item-action-pin"
              value={pin}
              onChange={setPin}
              hasError={Boolean(localError) && pin.length === 0}
              disabled={loading}
            />
            <p id="item-action-pin-hint" className="mt-1.5 text-[11px] text-[#7A6B5F]">
              ใช้ PIN 6 หลักของผู้จัดการหรือเจ้าของร้าน (PIN ของใครก็ได้ในร้าน)
            </p>
          </div>

          {message && (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700"
            >
              {message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E8DFD5] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="cursor-pointer rounded-full border border-[#d9c6b0] px-4 py-2 text-sm text-[#2D241E] transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-1 focus-visible:ring-offset-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-60 ${config.confirmClass}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "กำลังดำเนินการ..." : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
