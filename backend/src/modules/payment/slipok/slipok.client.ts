import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ตัวเรียก SlipOK API (เอกสาร SlipOK API Guide v1.13)
 *
 * POST {base}/api/line/apikey/{branchId}   header x-authorization: {apiKey}
 * body: data (ข้อความ QR มุมขวาล่างของสลิป) หรือ files (รูป base64) อย่างใดอย่างหนึ่ง + amount
 *
 * ตั้งใจส่ง log: false — บัญชี SlipOK เป็นบัญชีกลางของระบบ ถ้าส่ง log: true
 * SlipOK จะเทียบผู้รับกับบัญชีที่ผูกไว้ในบัญชีกลาง ทุกร้านจะโดน 1014 หมด
 * ระบบเราจึงตรวจสลิปซ้ำและบัญชีผู้รับเองตามคำแนะนำในเอกสาร
 */

export interface SlipOkParty {
  displayName?: string | null;
  name?: string | null;
  proxy?: { type?: string | null; value?: string | null } | null;
  account?: { type?: string | null; value?: string | null } | null;
}

export interface SlipOkSlip {
  success?: boolean;
  message?: string;
  transRef: string;
  transDate?: string; // yyyyMMdd
  transTime?: string; // HH:mm:ss
  transTimestamp?: string; // ISO 8601
  sendingBank?: string;
  receivingBank?: string;
  sender?: SlipOkParty;
  receiver?: SlipOkParty;
  amount: number;
  ref1?: string;
  ref2?: string;
  ref3?: string;
}

export type SlipOkInput = { qrData: string } | { imageBase64: string };

export type SlipOkResult =
  | { ok: true; slip: SlipOkSlip; raw: unknown }
  /** code = error code ของ SlipOK (1000-1015) หรือ null เมื่อเรียกไม่ถึง/ตอบผิดรูป */
  | {
      ok: false;
      code: number | null;
      message: string;
      slip?: SlipOkSlip;
      raw: unknown;
    };

export interface SlipOkQuota {
  quota: number;
  overQuota: number;
  specialQuota: number;
  endDate: string | null;
  specialEndDate: string | null;
}

/** รูปแบบ response ของ SlipOK: สำเร็จ { success, data } / ไม่สำเร็จ { code, message, data? } */
interface SlipOkEnvelope<T> {
  success?: boolean;
  code?: number;
  message?: string;
  data?: T | null;
}

@Injectable()
export class SlipOkClient {
  private readonly logger = new Logger(SlipOkClient.name);

  constructor(private readonly config: ConfigService) {}

  private get branchId() {
    return this.config.get<string>('SLIPOK_BRANCH_ID')?.trim() ?? '';
  }
  private get apiKey() {
    return this.config.get<string>('SLIPOK_API_KEY')?.trim() ?? '';
  }
  private get baseUrl() {
    return (
      this.config.get<string>('SLIPOK_BASE_URL') ?? 'https://api.slipok.com'
    ).replace(/\/+$/, '');
  }
  private get timeoutMs() {
    return Number(this.config.get('SLIPOK_TIMEOUT_MS') ?? 15000);
  }

  isConfigured(): boolean {
    return this.branchId !== '' && this.apiKey !== '';
  }

  private endpoint(suffix = '') {
    return `${this.baseUrl}/api/line/apikey/${encodeURIComponent(this.branchId)}${suffix}`;
  }

  async checkSlip(input: SlipOkInput, amount: number): Promise<SlipOkResult> {
    const body: Record<string, unknown> = { amount, log: false };
    if ('qrData' in input) body.data = input.qrData;
    else body.files = input.imageBase64;

    let res: Response;
    try {
      res = await fetch(this.endpoint(), {
        method: 'POST',
        headers: {
          'x-authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      // ออฟไลน์ / DNS / timeout — ห้าม log body เพราะมีรูปสลิป
      this.logger.warn(
        `SlipOK unreachable: ${(err as Error)?.name ?? 'Error'}`,
      );
      return { ok: false, code: null, message: 'unreachable', raw: null };
    }

    const json = (await res.json().catch(() => null)) as SlipOkEnvelope<
      Partial<SlipOkSlip>
    > | null;
    const data = json?.data ?? null;
    const slip = data?.transRef ? (data as SlipOkSlip) : undefined;
    if (res.ok && json?.success === true && slip) {
      return { ok: true, slip, raw: data };
    }
    const code = typeof json?.code === 'number' ? json.code : null;
    if (code === null)
      this.logger.warn(`SlipOK unexpected response: HTTP ${res.status}`);
    return {
      ok: false,
      code,
      message:
        typeof json?.message === 'string' ? json.message : `HTTP ${res.status}`,
      slip,
      raw: data,
    };
  }

  async getQuota(): Promise<SlipOkQuota | null> {
    try {
      const res = await fetch(this.endpoint('/quota'), {
        headers: { 'x-authorization': this.apiKey },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const json = (await res.json().catch(() => null)) as SlipOkEnvelope<
        Partial<SlipOkQuota>
      > | null;
      const d = json?.data;
      if (!res.ok || json?.success !== true || !d) return null;
      return {
        quota: Number(d.quota ?? 0),
        overQuota: Number(d.overQuota ?? 0),
        specialQuota: Number(d.specialQuota ?? 0),
        endDate: d.endDate ?? null,
        specialEndDate: d.specialEndDate ?? null,
      };
    } catch {
      return null;
    }
  }
}
