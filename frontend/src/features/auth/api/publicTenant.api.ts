import { apiFetch } from '../../../libs/appClient';
import type { ApiEnvelope } from '../../shifts/types/shift.types';

export interface PublicTenantLookup {
  /** รหัสที่ส่งไปหลัง normalize แล้ว */
  slug: string;
  /** มีร้านนี้ในระบบหรือไม่ */
  exists: boolean;
  /** ร้านยังเปิดใช้งานอยู่หรือไม่ (exists = true แต่ active = false คือถูกปิด) */
  active: boolean;
}

export const publicTenantApi = {
  /**
   * ตรวจรหัสร้านก่อนพาไปหน้าร้าน (ไม่ต้องมี token)
   * endpoint ตอบ 200 เสมอในกรณี "ไม่พบ" — ไม่ต้องดัก 404
   */
  lookup: (slug: string) =>
    apiFetch<ApiEnvelope<PublicTenantLookup>>(
      `/public/tenants/${encodeURIComponent(slug)}`,
      null,
    ).then((r) => r.data),
};
