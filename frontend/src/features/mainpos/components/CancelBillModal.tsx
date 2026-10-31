import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Loader2, ShieldCheck, Trash2, UserX, X } from "lucide-react"
import { PinInput } from "../../registerOwner/components/PinInput"
import type { CloseReason } from "../api/orders.api"

export type BillActionMode = "cancel" | "closeUnpaid"

export interface BillActionPayload {
  approverPin: string
  /** เหตุผลที่ยกเลิกทั้งบิล (mode cancel) */
  reason: string
  note?: string
  /** mode closeUnpaid เท่านั้น */
  closeReason?: CloseReason
}

interface CancelBillModalProps {
  isOpen: boolean
  mode: BillActionMode
  /** จำนวนรายการที่ยังไม่ถูก void ในบิล */
  itemCount: number
  /** ยอดค้างชำระของบิล (บาท) */
  total: number
  onClose: () => void
  onConfirm: (payload: BillActionPayload) => Promise<void> | void
  loading?: boolean
  /** ข้อความผิดพลาดจาก server (เช่น PIN ไม่ถูกต้อง) */
  error?: string | null
}

const MODES = {
  cancel: {
    title: "ยกเลิกทั้งบิล",
    description: "ยกเลิกรายการทั้งหมดแล้วปิดบิล — โต๊ะจะกลับเป็นว่าง",
    icon: Trash2,
    iconWrap: "bg-rose-50 text-rose-600 border-rose-100",
    confirmLabel: "ยืนยันยกเลิกทั้งบิล",
    confirmClass: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500",
    warning:
      "รายการที่ครัวเริ่มทำแล้วหรือเสิร์ฟแล้วจะยกเลิกไม่ได้ — ต้องใช้ \"ปิดบิลลูกค้าหนี (walkout)\" แทน",
    reasonLabel: "เหตุผลที่ยกเลิก",
    reasonPlaceholder: "ระบุเหตุผล เช่น ลูกค้าเปลี่ยนใจ, เปิดโต๊ะผิด, สั่งซ้ำ",
  },
  closeUnpaid: {
    title: "ปิดบิลโดยไม่เก็บเงิน",
    description: "ปิดบิลค้างเพื่อคืนโต๊ะ ใช้เมื่อลูกค้าออกไปโดยไม่จ่าย",
    icon: UserX,
    iconWrap: "bg-amber-50 text-amber-700 border-amber-100",
    confirmLabel: "ยืนยันปิดบิล",
    confirmClass: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
    warning:
      "บิลจะถูกปิดโดยไม่มีการชำระเงิน — ยอดขายของบิลนี้จะไม่ถูกนับ และไม่สามารถย้อนกลับได้",
    reasonLabel: "หมายเหตุ / หลักฐาน",
    reasonPlaceholder: "เช่น ลูกค้าออกไปโดยไม่จ่ายเงิน, พบโต๊ะว่างแต่ยังมีบิลค้าง",
  },
} as const

const CLOSE_REASON_OPTIONS: { value: CloseReason; label: string }[] = [
  { value: "walkout", label: "ลูกค้าหนี (walkout) — ยังมีรายการค้าง" },
  { value: "voided_all", label: "ยกเลิกรายการทั้งหมดแล้ว" },
  { value: "empty", label: "บิลว่าง ไม่มีรายการ" },
]

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CancelBillModal({
  isOpen,
  mode,
  itemCount,
  total,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: CancelBillModalProps) {
  const config = MODES[mode]
  const Icon = config.icon
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [pin, setPin] = useState("")
  const [closeReason, setCloseReason] = useState<CloseReason>("walkout")
  const [localError, setLocalError] = useState<string | null>(null)
  const reasonRef = useRef<HTMLTextAreaElement | null>(null)

  // เปิด modal ใหม่ (หรือเปลี่ยนโหมด) = เริ่มจากฟอร์มว่าง
  const formKey = isOpen ? `${mode}|${itemCount}` : null
  const [lastFormKey, setLastFormKey] = useState<string | null>(null)
  if (formKey !== lastFormKey) {
    setLastFormKey(formKey)
    setReason("")
    setNote("")
    setPin("")
    setCloseReason("walkout")
    setLocalError(null)
  }

  const handleClose = useCallback(() => {
    if (loading) return
    onClose()
  }, [loading, onClose])

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setTimeout(() => reasonRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  // ล็อกการเลื่อนพื้นหลัง + ปิดด้วย Esc
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const noteRequired = mode === "closeUnpaid" && closeReason === "walkout" && itemCount > 0

  const handleConfirm = async () => {
    if (mode === "cancel" && !reason.trim()) {
      setLocalError("กรุณาระบุเหตุผลก่อนยืนยัน")
      reasonRef.current?.focus()
      return
    }
    if (noteRequired && !note.trim()) {
      setLocalError("การปิดบิลลูกค้าหนีต้องระบุหมายเหตุ")
      reasonRef.current?.focus()
      return
    }
    if (!/^\d{6}$/.test(pin)) {
      setLocalError("กรุณากรอก PIN ผู้อนุมัติให้ครบ 6 หลัก")
      return
    }
    setLocalError(null)
    await onConfirm({
      approverPin: pin,
      reason: reason.trim(),
      note: note.trim() || undefined,
      closeReason: mode === "closeUnpaid" ? closeReason : undefined,
    })
  }

  const message = localError ?? error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-kanit">
      <div
        className="absolute inset-0 bg-[#2D241E]/45"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-bill-title"
        aria-describedby="cancel-bill-desc"
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
            <h2 id="cancel-bill-title" className="text-base font-semibold text-[#2D241E]">
              {config.title}
            </h2>
            <p id="cancel-bill-desc" className="mt-0.5 text-xs text-[#7A6B5F]">
              {config.description} · ต้องมีผู้จัดการหรือเจ้าของร้านกรอก PIN เพื่ออนุมัติ
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
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-[#2D241E]">
                รายการในบิล{" "}
                <span className="font-semibold">{itemCount}</span> รายการ
              </p>
              <p className="text-sm font-semibold text-[#5C3D1E]">฿{money(total)}</p>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-rose-700">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {config.warning}
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] leading-relaxed text-emerald-700">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              เมื่อปิดบิลสำเร็จ โต๊ะนี้จะกลับเป็น &quot;ว่าง&quot; และรับลูกค้าใหม่ได้ทันที
            </p>
          </div>

          {mode === "closeUnpaid" && (
            <div>
              <label htmlFor="cancel-bill-reason-type" className="mb-1.5 block text-sm text-[#2D241E]">
                เหตุผลการปิดบิล <span className="text-rose-600">*</span>
              </label>
              <select
                id="cancel-bill-reason-type"
                value={closeReason}
                onChange={(event) => setCloseReason(event.target.value as CloseReason)}
                disabled={loading}
                className="w-full cursor-pointer rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm text-[#2D241E] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {CLOSE_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "cancel" && (
            <div>
              <label htmlFor="cancel-bill-reason" className="mb-1.5 block text-sm text-[#2D241E]">
                {config.reasonLabel} <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="cancel-bill-reason"
                ref={reasonRef}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={config.reasonPlaceholder}
                rows={2}
                disabled={loading}
                aria-invalid={Boolean(localError) && !reason.trim()}
                className="w-full resize-none rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm text-[#2D241E] transition-colors duration-200 placeholder:text-[#A68874]/70 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/25 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          )}

          <div>
            <label htmlFor="cancel-bill-note" className="mb-1.5 block text-sm text-[#2D241E]">
              {mode === "closeUnpaid" ? "หมายเหตุ / หลักฐาน" : "หมายเหตุเพิ่มเติม"}
              {noteRequired && <span className="text-rose-600"> *</span>}
            </label>
            <textarea
              id="cancel-bill-note"
              ref={mode === "closeUnpaid" ? reasonRef : undefined}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={config.reasonPlaceholder}
              rows={2}
              disabled={loading}
              aria-invalid={noteRequired && !note.trim()}
              aria-describedby="cancel-bill-note-hint"
              className="w-full resize-none rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm text-[#2D241E] transition-colors duration-200 placeholder:text-[#A68874]/70 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/25 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p id="cancel-bill-note-hint" className="mt-1.5 text-[11px] text-[#7A6B5F]">
              {noteRequired
                ? "บังคับเมื่อปิดบิลลูกค้าหนีและยังมีรายการค้าง — ใช้เป็นหลักฐานใน audit log"
                : "ไม่บังคับ แต่ช่วยให้ตรวจย้อนหลังได้ง่ายขึ้น"}
            </p>
          </div>

          <div>
            <label htmlFor="cancel-bill-pin" className="mb-1.5 block text-sm text-[#2D241E]">
              PIN ผู้อนุมัติ <span className="text-rose-600">*</span>
            </label>
            <PinInput
              id="cancel-bill-pin"
              value={pin}
              onChange={setPin}
              hasError={Boolean(localError) && pin.length === 0}
              disabled={loading}
            />
            <p className="mt-1.5 text-[11px] text-[#7A6B5F]">
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
  )
}
