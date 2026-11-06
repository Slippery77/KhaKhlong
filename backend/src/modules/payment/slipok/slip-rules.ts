import { HttpStatus } from '@nestjs/common';
import type { SlipOkSlip } from './slipok.client';

/** สลิปที่โอนก่อนเริ่มชำระเกินเวลานี้ถือว่าเป็นสลิปเก่า (เผื่อนาฬิกาเครื่องคลาดเคลื่อน) */
export const SLIP_MAX_AGE_BEFORE_ATTEMPT_MS = 10 * 60 * 1000;

export type ReceiverMatch = 'matched' | 'unverifiable' | 'mismatch';

/** ตัดทุกอย่างที่ไม่ใช่ตัวเลขหรือ x/X ออก แล้วทำ x เป็นตัวพิมพ์เล็ก (ตามเอกสาร SlipOK หัวข้อ Compare Receiver Account) */
export function normalizeMasked(value: string): string {
  return value.replace(/[^0-9xX]/g, '').toLowerCase();
}

/** รูปแบบที่เลขพร้อมเพย์ของร้านอาจปรากฏในสลิป เช่น 0812345678 ↔ 66812345678 */
function promptpayVariants(promptpayId: string): string[] {
  const digits = promptpayId.replace(/\D/g, '');
  const variants = new Set([digits]);
  if (digits.length === 10 && digits.startsWith('0'))
    variants.add(`66${digits.slice(1)}`);
  if (digits.length === 11 && digits.startsWith('66'))
    variants.add(`0${digits.slice(2)}`);
  return [...variants];
}

/** เทียบเลขที่ถูก mask ทีละตำแหน่ง ต้องยาวเท่ากันและเห็นตัวเลขอย่างน้อย 3 หลัก */
export function maskedEquals(masked: string, target: string): boolean {
  const m = normalizeMasked(masked);
  if (m.length !== target.length) return false;
  let revealed = 0;
  for (let i = 0; i < m.length; i++) {
    if (m[i] === 'x') continue;
    if (m[i] !== target[i]) return false;
    revealed++;
  }
  return revealed >= 3;
}

/**
 * เทียบผู้รับในสลิปกับเลขพร้อมเพย์ของร้าน
 * - สลิปมี receiver.proxy (โอนผ่านพร้อมเพย์) → ต้องตรง ไม่ตรง = mismatch
 * - สลิปมีแต่เลขบัญชีธนาคาร (ธนาคารผู้โอนบางเจ้า) → unverifiable เพราะระบบไม่รู้เลขบัญชีที่ผูกพร้อมเพย์
 */
export function matchReceiver(
  slip: SlipOkSlip,
  promptpayId: string,
): ReceiverMatch {
  const proxy = slip.receiver?.proxy?.value?.trim();
  if (!proxy) return 'unverifiable';
  return promptpayVariants(promptpayId).some((v) => maskedEquals(proxy, v))
    ? 'matched'
    : 'mismatch';
}

/** เวลาโอนในสลิป: ใช้ transTimestamp ก่อน ไม่มีค่อยประกอบจาก transDate + transTime (เวลาไทย) */
export function slipTransAt(slip: SlipOkSlip): Date | null {
  if (slip.transTimestamp) {
    const d = new Date(slip.transTimestamp);
    if (!isNaN(d.getTime())) return d;
  }
  const date = slip.transDate;
  if (date && /^\d{8}$/.test(date)) {
    const time =
      slip.transTime && /^\d{2}:\d{2}:\d{2}$/.test(slip.transTime)
        ? slip.transTime
        : '00:00:00';
    const d = new Date(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time}+07:00`,
    );
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export interface SlipError {
  code: string;
  status: HttpStatus;
  message: string;
  /** 'error' = ปัญหาฝั่งบริการ ไม่ใช่สลิปผิด */
  result: 'rejected' | 'error';
}

const FALLBACK_HINT =
  'ตรวจเงินเข้าแอปธนาคารของร้าน แล้วกด "ยืนยันรับเงิน" แทนได้';

/** แปลง error code ของ SlipOK เป็น code/ข้อความของระบบ (code === null = เรียก SlipOK ไม่สำเร็จ) */
export function mapSlipOkError(
  code: number | null,
  slipOkMessage: string,
): SlipError {
  switch (code) {
    case 1000:
      return {
        code: 'SLIP_INPUT_MISSING',
        status: HttpStatus.BAD_REQUEST,
        message: 'ไม่พบข้อมูลสลิป',
        result: 'rejected',
      };
    case 1005:
    case 1006:
      return {
        code: 'SLIP_IMAGE_INVALID',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'รูปสลิปไม่ถูกต้อง รองรับ JPG, PNG, WEBP',
        result: 'rejected',
      };
    case 1007:
      return {
        code: 'SLIP_NO_QR',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'ไม่พบ QR บนรูปสลิป ถ่ายให้เห็น QR มุมขวาล่างชัด ๆ',
        result: 'rejected',
      };
    case 1008:
      return {
        code: 'SLIP_NOT_PAYMENT_QR',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'QR นี้ไม่ใช่ QR ของสลิปโอนเงิน',
        result: 'rejected',
      };
    case 1010:
      return {
        code: 'SLIP_BANK_DELAY',
        status: HttpStatus.CONFLICT,
        message:
          slipOkMessage ||
          'ธนาคารผู้โอนยังไม่ส่งข้อมูล กรุณารอสักครู่แล้วตรวจใหม่',
        result: 'rejected',
      };
    case 1011:
      return {
        code: 'SLIP_NOT_FOUND',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'ไม่พบรายการโอนนี้ในธนาคาร (สลิปปลอมหรือ QR หมดอายุ)',
        result: 'rejected',
      };
    case 1012:
      return {
        code: 'SLIP_DUPLICATE',
        status: HttpStatus.CONFLICT,
        message: 'สลิปนี้เคยใช้ชำระไปแล้ว',
        result: 'rejected',
      };
    case 1013:
      return {
        code: 'SLIP_AMOUNT_MISMATCH',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'ยอดในสลิปไม่ตรงกับยอดที่ต้องชำระ',
        result: 'rejected',
      };
    case 1014:
      return {
        code: 'SLIP_RECEIVER_MISMATCH',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'บัญชีผู้รับในสลิปไม่ใช่พร้อมเพย์ของร้าน',
        result: 'rejected',
      };
    case 1009:
      return {
        code: 'SLIPOK_UNAVAILABLE',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: `ระบบธนาคารขัดข้องชั่วคราว ${FALLBACK_HINT}`,
        result: 'error',
      };
    case 1001:
    case 1002:
    case 1003:
    case 1004:
    case 1015:
      return {
        code: 'SLIPOK_ACCOUNT_ERROR',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: `บริการตรวจสลิปใช้งานไม่ได้ (บัญชีหรือโควต้า) ${FALLBACK_HINT}`,
        result: 'error',
      };
    default:
      return {
        code: 'SLIPOK_UNAVAILABLE',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: `เชื่อมต่อบริการตรวจสลิปไม่ได้ ${FALLBACK_HINT}`,
        result: 'error',
      };
  }
}
