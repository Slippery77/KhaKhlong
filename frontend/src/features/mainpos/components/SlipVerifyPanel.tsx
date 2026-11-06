import { useRef } from 'react';
import { Camera, Loader2, ShieldCheck, WifiOff } from 'lucide-react';
import type { SlipInput, SlipVerificationStatus } from '../types/payment.type';

interface SlipVerifyPanelProps {
    status: SlipVerificationStatus | null;
    busy: boolean;
    online: boolean;
    onVerify: (input: SlipInput) => Promise<void>;
    onLocalError: (message: string) => void;
}

const MAX_SIDE = 1600;

/** ย่อรูปสลิปให้ด้านยาวไม่เกิน 1600px แล้วแปลงเป็น JPEG base64 — QR บนสลิปยังอ่านได้ และไม่เกิน body limit 2MB */
async function imageToBase64(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.85);
}

export default function SlipVerifyPanel({ status, busy, online, onVerify, onLocalError }: SlipVerifyPanelProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const disabled = busy || !online;
    const quota = status?.quota ? status.quota.quota + status.quota.specialQuota : null;

    const handleFile = async (file: File | undefined) => {
        if (!file || disabled) return;
        if (!file.type.startsWith('image/')) {
            onLocalError('เลือกไฟล์รูปภาพสลิปเท่านั้น');
            return;
        }
        let imageBase64: string;
        try {
            imageBase64 = await imageToBase64(file);
        } catch {
            onLocalError('อ่านรูปสลิปไม่ได้ ลองถ่ายใหม่อีกครั้ง');
            return;
        }
        await onVerify({ imageBase64 });
    };

    return (
        <section aria-labelledby="slip-verify-title" className="mt-2.5 sm:mt-3 rounded-xl border border-[#E8DFD5] bg-white p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
                <h4 id="slip-verify-title" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#2D241E]">
                    <ShieldCheck className="h-4 w-4 text-[#8C6D58]" aria-hidden="true" />
                    ตรวจสลิปอัตโนมัติ
                </h4>
                {quota !== null && (
                    <span className="text-[10px] sm:text-[11px] text-stone-500 tabular-nums">เหลือ {quota.toLocaleString('th-TH')} สลิป</span>
                )}
            </div>

            {!online ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-500">
                    <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ออฟไลน์อยู่ ตรวจสลิปไม่ได้ ตรวจเงินเข้าแอปธนาคารแล้วกด “ยืนยันรับเงิน” แทน
                </p>
            ) : (
                <>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            void handleFile(file);
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={disabled}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8C6D58] py-2 text-xs sm:text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
                        {busy ? 'กำลังตรวจสลิป...' : 'ถ่าย / เลือกรูปสลิป'}
                    </button>
                    <p className="mt-1.5 text-[10px] sm:text-[11px] leading-relaxed text-stone-500">
                        สลิปถูกต้องระบบจะปิดบิลให้ทันที ถ้าตรวจไม่ได้ยังกด “ยืนยันรับเงิน” เองได้
                    </p>
                </>
            )}
        </section>
    );
}
