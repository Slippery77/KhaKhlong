import { apiFetch } from '../../../libs/appClient';
import type { ApiEnvelope, Shift } from '../types/shift.types';

export const shiftsApi = {
  getCurrent: (token: string | null) =>
    apiFetch<ApiEnvelope<Shift | null>>('/shifts/current', token),

  open: (token: string | null, openingCash: number) =>
    apiFetch<ApiEnvelope<Shift>>('/shifts/open', token, 'POST', { openingCash }),

  close: (token: string | null, shiftId: string, actualClosingCash: number) =>
    apiFetch<ApiEnvelope<Shift>>(`/shifts/${shiftId}/close`, token, 'POST', {
      actualClosingCash,
    }),

  // PIN ของผู้จัดการ/เจ้าของร้านคนใดก็ได้ในร้าน — server เป็นคนตัดสินว่าใครรับรอง
  verify: (token: string | null, shiftId: string, pin: string) =>
    apiFetch<ApiEnvelope<Shift>>(`/shifts/${shiftId}/verify`, token, 'POST', { pin }),

  list: (token: string | null, params?: { from?: string; to?: string; status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<ApiEnvelope<Shift[]>>(`/shifts${qs ? `?${qs}` : ''}`, token);
  },
};
